import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import { isUniqueViolation } from "../common/db-errors.js";
import { serializeFolderPlain } from "../common/serialize.js";
import type { Folder, FolderSubtreeStats } from "../../../shared/types.js";

const NAME_CONFLICT_MESSAGE = "An item with this name already exists in this location.";

/**
 * A deleted folder is a "trash root" — the thing that shows up as its own row in the Trash
 * view — when it has no live parent folder. If its parent is also deleted, it was swept up
 * in the parent's deletion and should appear nested under the parent's trash entry instead
 * of as its own row. Exported as a plain function (not a class method) so trash.service can
 * compose it into its own queries without a DI dependency on FoldersService — port of v1's
 * folderIsTrashRoot, expressed via Prisma's relation filters instead of a raw NOT EXISTS
 * subquery (logically equivalent: "no parent" and "parent isn't deleted" both mean root).
 */
export function folderTrashRootWhere(
  deletedAtFilter: Prisma.FolderWhereInput["deletedAt"] = { not: null },
): Prisma.FolderWhereInput {
  return {
    deletedAt: deletedAtFilter,
    OR: [{ parentFolderId: null }, { parentFolder: { deletedAt: null } }],
  };
}

// Port of v1's server/services/folders.service.ts, scoped to a real owner throughout —
// see CLAUDE.md §4 and datarooms.service.ts's module doc comment for the Phase 2 auth model.
@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blobService: BlobService,
  ) {}

  private async getDescendantFolderIds(
    rootFolderId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<string[]> {
    const rows = await client.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id FROM folders WHERE id = ${rootFolderId}
        UNION ALL
        SELECT f.id FROM folders f JOIN descendants d ON f."parentFolderId" = d.id
      )
      SELECT id FROM descendants
    `;
    return rows.map((row) => row.id);
  }

  async createFolder(
    userId: string,
    dataroomId: string,
    parentFolderId: string | null,
    name: string,
  ): Promise<Folder> {
    const dataroom = await this.prisma.dataroom.findFirst({
      where: { id: dataroomId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!dataroom) throw ApiException.notFound("Data room");

    if (parentFolderId) {
      const parent = await this.prisma.folder.findFirst({
        where: { id: parentFolderId, dataroomId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) throw ApiException.notFound("Parent folder");
    }

    try {
      const row = await this.prisma.folder.create({ data: { dataroomId, parentFolderId, name } });
      return serializeFolderPlain(row);
    } catch (err) {
      if (isUniqueViolation(err, "folders_unique_name_per_parent")) {
        throw ApiException.conflict(NAME_CONFLICT_MESSAGE);
      }
      throw err;
    }
  }

  async renameFolder(userId: string, folderId: string, name: string): Promise<Folder> {
    try {
      const result = await this.prisma.folder.updateMany({
        where: { id: folderId, deletedAt: null, dataroom: { ownerId: userId } },
        data: { name, updatedAt: new Date() },
      });
      if (result.count === 0) throw ApiException.notFound("Folder");
      const row = await this.prisma.folder.findUniqueOrThrow({ where: { id: folderId } });
      return serializeFolderPlain(row);
    } catch (err) {
      if (isUniqueViolation(err, "folders_unique_name_per_parent")) {
        throw ApiException.conflict(NAME_CONFLICT_MESSAGE);
      }
      throw err;
    }
  }

  /**
   * Counts of *live* descendants — folders and files that would be swept into Trash by
   * deleting this folder — for the delete-warning dialog ("this will also move N folders and
   * M files"). The root folder itself is excluded from folderCount (it's already named in the
   * dialog's own title); already-deleted descendants aren't counted since this soft-delete
   * wouldn't additionally affect them from the user's perspective.
   */
  async getSubtreeStats(userId: string, folderId: string): Promise<FolderSubtreeStats> {
    const owned = await this.prisma.folder.findFirst({
      where: { id: folderId, deletedAt: null, dataroom: { ownerId: userId } },
      select: { id: true },
    });
    if (!owned) throw ApiException.notFound("Folder");

    const descendantIds = await this.getDescendantFolderIds(folderId);
    const nestedFolderIds = descendantIds.filter((id) => id !== folderId);

    const [folderCount, fileCount] = await Promise.all([
      this.prisma.folder.count({ where: { id: { in: nestedFolderIds }, deletedAt: null } }),
      this.prisma.file.count({ where: { folderId: { in: descendantIds }, deletedAt: null } }),
    ]);

    return { folderCount, fileCount };
  }

  async deleteFolder(userId: string, folderId: string): Promise<void> {
    const row = await this.prisma.folder.findFirst({
      where: { id: folderId, deletedAt: null, dataroom: { ownerId: userId } },
      select: { id: true },
    });
    if (!row) throw ApiException.notFound("Folder");
    await this.softDeleteFolder(folderId);
  }

  /**
   * Deletes multiple folders in one request instead of N sequential ones from the client
   * (bulk-select). Each folder's own cascade stays independently atomic via softDeleteFolder's
   * existing per-folder transaction — these aren't joined into one giant cross-subtree
   * transaction, since the selected folders are logically independent of each other. Ids that
   * don't exist or aren't owned by this user are silently excluded rather than failing the
   * whole batch, matching bulkDelete's behavior in files.service.ts.
   */
  async bulkSoftDelete(userId: string, folderIds: string[]): Promise<void> {
    const owned = await this.prisma.folder.findMany({
      where: { id: { in: folderIds }, deletedAt: null, dataroom: { ownerId: userId } },
      select: { id: true },
    });
    await Promise.all(owned.map((f) => this.softDeleteFolder(f.id)));
  }

  async softDeleteFolder(folderId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const ids = await this.getDescendantFolderIds(folderId, tx);
      const now = new Date();
      await tx.folder.updateMany({ where: { id: { in: ids } }, data: { deletedAt: now, updatedAt: now } });
      await tx.file.updateMany({ where: { folderId: { in: ids } }, data: { deletedAt: now, updatedAt: now } });
    });
  }

  async restoreFolderById(userId: string, folderId: string): Promise<void> {
    const owned = await this.prisma.folder.findFirst({
      where: { id: folderId, dataroom: { ownerId: userId } },
      select: { id: true },
    });
    if (!owned) throw ApiException.notFound("Folder");

    await this.prisma.$transaction(async (tx) => {
      const ids = await this.getDescendantFolderIds(folderId, tx);
      const now = new Date();
      await tx.folder.updateMany({ where: { id: { in: ids } }, data: { deletedAt: null, updatedAt: now } });
      await tx.file.updateMany({ where: { folderId: { in: ids } }, data: { deletedAt: null, updatedAt: now } });
    });
  }

  // Internal — called only after the caller (trash service, this service) has already
  // verified ownership. No userId param.
  async purgeFolderPermanently(folderId: string): Promise<void> {
    const ids = await this.getDescendantFolderIds(folderId);
    const filesInSubtree = await this.prisma.file.findMany({
      where: { folderId: { in: ids } },
      select: { blobPathname: true },
    });

    await this.blobService.deleteBlobs(filesInSubtree.map((f) => f.blobPathname));
    // Deleting the root folder cascades to descendant folders and their files at the FK
    // level (ON DELETE CASCADE), so only the root row needs removing here.
    await this.prisma.folder.delete({ where: { id: folderId } });
  }
}
