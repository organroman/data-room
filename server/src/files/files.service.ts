import { HttpStatus, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { StarredService } from "../starred/starred.service.js";
import { SharesAccessService } from "../sharing/shares-access.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import { isUniqueViolation, isRecordNotFound } from "../common/db-errors.js";
import { serializeFileEntry } from "../common/serialize.js";
import type { BulkMoveResult, FileEntry } from "../../../shared/types.js";

const NAME_CONFLICT_MESSAGE = "An item with this name already exists in this location.";
const MAX_NAME_RESOLUTION_ATTEMPTS = 5;

/**
 * A deleted file is a "trash root" when its parent folder isn't also deleted (files with
 * no folder, i.e. dataroom-root files, are always roots). Mirrors folderTrashRootWhere in
 * folders.service.ts — port of v1's fileIsTrashRoot.
 */
export function fileTrashRootWhere(
  deletedAtFilter: Prisma.FileWhereInput["deletedAt"] = { not: null },
): Prisma.FileWhereInput {
  return {
    deletedAt: deletedAtFilter,
    OR: [{ folderId: null }, { folder: { deletedAt: null } }],
  };
}

function splitExtension(name: string): { base: string; ext: string } {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, dotIndex), ext: name.slice(dotIndex) };
}

// Port of v1's server/services/files.service.ts, scoped to a real owner throughout — see
// CLAUDE.md §4 and datarooms.service.ts's module doc comment for the Phase 2 auth model.
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blobService: BlobService,
    private readonly starredService: StarredService,
    private readonly sharesAccessService: SharesAccessService,
  ) {}

  /**
   * Resolves a file name to one that doesn't collide with a live sibling in the same
   * folder, auto-suffixing "(1)", "(2)", ... before the extension. Used only for uploads;
   * renames reject on collision instead.
   */
  private async resolveUniqueFileName(
    dataroomId: string,
    folderId: string | null,
    desiredName: string,
  ): Promise<{ name: string; renamed: boolean }> {
    const existing = await this.prisma.file.findMany({
      where: { dataroomId, folderId, deletedAt: null },
      select: { name: true },
    });

    const existingNames = new Set(existing.map((f) => f.name));
    if (!existingNames.has(desiredName)) {
      return { name: desiredName, renamed: false };
    }

    const { base, ext } = splitExtension(desiredName);
    let n = 1;
    let candidate = `${base} (${n})${ext}`;
    while (existingNames.has(candidate)) {
      n += 1;
      candidate = `${base} (${n})${ext}`;
    }
    return { name: candidate, renamed: true };
  }

  async confirmFileUpload(
    userId: string,
    input: {
      dataroomId: string;
      folderId: string | null;
      name: string;
      size: number;
      blobUrl: string;
      blobPathname: string;
    },
  ): Promise<{ file: FileEntry; renamed: boolean }> {
    const dataroom = await this.prisma.dataroom.findFirst({
      where: { id: input.dataroomId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!dataroom) throw ApiException.notFound("Data room");

    if (input.folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: input.folderId, dataroomId: input.dataroomId, deletedAt: null },
        select: { id: true },
      });
      if (!folder) throw ApiException.notFound("Folder");
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_NAME_RESOLUTION_ATTEMPTS; attempt++) {
      const { name, renamed } = await this.resolveUniqueFileName(input.dataroomId, input.folderId, input.name);
      try {
        const row = await this.prisma.file.create({
          data: {
            dataroomId: input.dataroomId,
            folderId: input.folderId,
            name,
            size: input.size,
            blobUrl: input.blobUrl,
            blobPathname: input.blobPathname,
          },
        });
        return { file: serializeFileEntry(row, false), renamed };
      } catch (err) {
        if (isUniqueViolation(err, "files_unique_name_per_parent")) {
          lastError = err;
          continue; // another request landed the same name first; re-resolve and retry
        }
        throw err;
      }
    }
    throw lastError;
  }

  async renameFile(userId: string, fileId: string, name: string): Promise<FileEntry> {
    try {
      const result = await this.prisma.file.updateMany({
        where: { id: fileId, deletedAt: null, dataroom: { ownerId: userId } },
        data: { name, updatedAt: new Date() },
      });
      if (result.count === 0) throw ApiException.notFound("File");
      const row = await this.prisma.file.findUniqueOrThrow({ where: { id: fileId } });
      const starredIds = await this.starredService.getStarredIds(userId, "file");
      return serializeFileEntry(row, starredIds.has(row.id));
    } catch (err) {
      if (isUniqueViolation(err, "files_unique_name_per_parent")) {
        throw ApiException.conflict(NAME_CONFLICT_MESSAGE);
      }
      throw err;
    }
  }

  /**
   * Moves a file to another folder within the same data room (or to the root, via
   * `targetFolderId: null`). Name-conflict handling matches rename, not upload — a hard 409,
   * no auto-suffix: this is a single deliberate action the user is watching happen (same
   * category as rename), not a background/batch operation where silently renaming would be
   * the friendlier default. See CLAUDE.md §6.
   *
   * One query does the whole authorization + move: Prisma allows extra non-unique conditions
   * alongside a unique `id` in `update()`, applied as additional WHERE clauses against the row
   * Prisma found by id — so ownership *and* "the target folder exists in this same data room"
   * are checked in the same round trip as the update itself (and, unlike `updateMany`, `update`
   * returns the row). A combined-condition miss surfaces as P2025 (isRecordNotFound), collapsing
   * "file not found", "not yours", and "target folder isn't in this data room" into one 404 —
   * an acceptable trade for one query instead of three, since an invalid folderId here only
   * happens from a stale/tampered request, never from the folder-tree-picker UI.
   */
  async moveFile(userId: string, fileId: string, targetFolderId: string | null): Promise<FileEntry> {
    try {
      const row = await this.prisma.file.update({
        where: {
          id: fileId,
          deletedAt: null,
          dataroom: {
            ownerId: userId,
            ...(targetFolderId ? { folders: { some: { id: targetFolderId, deletedAt: null } } } : {}),
          },
        },
        data: { folderId: targetFolderId, updatedAt: new Date() },
      });
      const starred = await this.prisma.starredItem.findFirst({
        where: { entityType: "file", entityId: fileId, userId },
        select: { id: true },
      });
      return serializeFileEntry(row, Boolean(starred));
    } catch (err) {
      if (isRecordNotFound(err)) throw ApiException.notFound("File");
      if (isUniqueViolation(err, "files_unique_name_per_parent")) {
        throw ApiException.conflict(NAME_CONFLICT_MESSAGE);
      }
      throw err;
    }
  }

  async deleteFile(userId: string, fileId: string): Promise<void> {
    const now = new Date();
    const result = await this.prisma.file.updateMany({
      where: { id: fileId, deletedAt: null, dataroom: { ownerId: userId } },
      data: { deletedAt: now, updatedAt: now },
    });
    if (result.count === 0) throw ApiException.notFound("File");
  }

  /**
   * Deletes multiple files in one request instead of N sequential ones from the client
   * (bulk-select) — unlike bulkSoftDelete on folders, this is naturally a single updateMany,
   * no per-item transaction needed. Ids that don't exist or aren't owned are silently excluded.
   */
  async bulkDelete(userId: string, fileIds: string[]): Promise<void> {
    const now = new Date();
    await this.prisma.file.updateMany({
      where: { id: { in: fileIds }, deletedAt: null, dataroom: { ownerId: userId } },
      data: { deletedAt: now, updatedAt: now },
    });
  }

  /**
   * Moves multiple files to the same destination in one request. Runs sequentially through
   * the existing single-file moveFile (already a single optimized query per file — see its
   * own doc comment) rather than a batch updateMany, since each file needs its own
   * collision check against the destination — best-effort, not all-or-nothing: a file whose
   * name collides in the destination is skipped (counted, not silently renamed — matches
   * single-file move's hard-reject convention) rather than blocking the rest of the batch.
   */
  async bulkMove(userId: string, fileIds: string[], targetFolderId: string | null): Promise<BulkMoveResult> {
    let movedCount = 0;
    let conflictCount = 0;
    for (const fileId of fileIds) {
      try {
        await this.moveFile(userId, fileId, targetFolderId);
        movedCount++;
      } catch (err) {
        if (err instanceof ApiException && err.getStatus() === HttpStatus.CONFLICT) {
          conflictCount++;
          continue;
        }
        if (err instanceof ApiException && err.getStatus() === HttpStatus.NOT_FOUND) {
          continue; // not owned / doesn't exist — silently skip, same as bulkDelete
        }
        throw err;
      }
    }
    return { movedCount, conflictCount };
  }

  async restoreFile(userId: string, fileId: string): Promise<void> {
    const result = await this.prisma.file.updateMany({
      where: { id: fileId, dataroom: { ownerId: userId } },
      data: { deletedAt: null, updatedAt: new Date() },
    });
    if (result.count === 0) throw ApiException.notFound("File");
  }

  // Internal — called only after the caller has already verified ownership.
  async purgeFilePermanently(fileId: string): Promise<void> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId }, select: { blobPathname: true } });
    if (!file) return;
    await this.blobService.deleteBlobs([file.blobPathname]);
    await this.prisma.file.delete({ where: { id: fileId } });
  }

  /**
   * Share-aware as of Phase 3 (used by the file preview panel, reachable both from a
   * dataroom the caller owns and from a shared/public view) — same pattern as
   * DataroomsService.getDataroomContents, see its doc comment and CLAUDE.md §5.
   */
  async getFileById(userId: string | undefined, fileId: string, token: string | undefined): Promise<FileEntry> {
    await this.sharesAccessService.assertCanView("file", fileId, userId, token);

    const row = await this.prisma.file.findFirst({ where: { id: fileId, deletedAt: null } });
    if (!row) throw ApiException.notFound("File");

    const starredIds = userId ? await this.starredService.getStarredIds(userId, "file") : new Set<string>();
    const dataroom = await this.prisma.dataroom.findUnique({
      where: { id: row.dataroomId },
      select: { ownerId: true },
    });
    return { ...serializeFileEntry(row, starredIds.has(row.id)), isOwner: dataroom?.ownerId === userId };
  }
}
