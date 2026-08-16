import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { BlobService } from "../blob/blob.service.js";
import { StarredService } from "../starred/starred.service.js";
import { ApiException } from "../common/exceptions/api.exception.js";
import { serializeDataroom, serializeFolderPlain, serializeFolderEntry, serializeFileEntry } from "../common/serialize.js";
import type { Dataroom, DataroomSummary, Folder, FolderContents, BrowserEntry } from "../../../shared/types.js";

interface DataroomStats {
  storageBytes: number;
  folderCount: number;
  fileCount: number;
}

type RawCount = string | number | bigint | null;

// Port of v1's server/services/datarooms.service.ts, scoped to a real owner (session.user.id)
// throughout — see CLAUDE.md §4. Not yet share-aware: a dataroom is visible/mutable here only
// to its owner, which is exactly Phase 2's scope ("no sharing yet, just must be your own
// dataroom"); the OptionalAuth + access-resolution layer lands in Phase 3.
@Injectable()
export class DataroomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blobService: BlobService,
    private readonly starredService: StarredService,
  ) {}

  /** Storage/item counts per dataroom owned by `userId`, live (non-deleted) items only. */
  private async getDataroomStats(userId: string): Promise<Map<string, DataroomStats>> {
    const rows = await this.prisma.$queryRaw<
      { dataroom_id: string; storage_bytes: RawCount; folder_count: RawCount; file_count: RawCount }[]
    >`
      SELECT
        d.id AS dataroom_id,
        coalesce(f.storage_bytes, 0) AS storage_bytes,
        coalesce(fo.folder_count, 0) AS folder_count,
        coalesce(f.file_count, 0) AS file_count
      FROM datarooms d
      LEFT JOIN (
        SELECT "dataroomId", sum(size) AS storage_bytes, count(*) AS file_count
        FROM files WHERE "deletedAt" IS NULL GROUP BY "dataroomId"
      ) f ON f."dataroomId" = d.id
      LEFT JOIN (
        SELECT "dataroomId", count(*) AS folder_count
        FROM folders WHERE "deletedAt" IS NULL GROUP BY "dataroomId"
      ) fo ON fo."dataroomId" = d.id
      WHERE d."deletedAt" IS NULL AND d."ownerId" = ${userId}
    `;

    const stats = new Map<string, DataroomStats>();
    for (const row of rows) {
      stats.set(row.dataroom_id, {
        storageBytes: Number(row.storage_bytes ?? 0),
        folderCount: Number(row.folder_count),
        fileCount: Number(row.file_count),
      });
    }
    return stats;
  }

  private async getBreadcrumbs(folderId: string): Promise<Array<{ id: string; name: string }>> {
    return this.prisma.$queryRaw<{ id: string; name: string }[]>`
      WITH RECURSIVE ancestors AS (
        SELECT id, "parentFolderId", name, 0 AS depth FROM folders WHERE id = ${folderId}
        UNION ALL
        SELECT f.id, f."parentFolderId", f.name, a.depth + 1
        FROM folders f JOIN ancestors a ON f.id = a."parentFolderId"
      )
      SELECT id, name FROM ancestors ORDER BY depth DESC
    `;
  }

  async listDatarooms(userId: string): Promise<DataroomSummary[]> {
    const [rows, stats, starredIds] = await Promise.all([
      this.prisma.dataroom.findMany({
        where: { ownerId: userId, deletedAt: null },
        orderBy: { updatedAt: "asc" },
      }),
      this.getDataroomStats(userId),
      this.starredService.getStarredIds(userId, "dataroom"),
    ]);

    return rows.map((row) => {
      const s = stats.get(row.id);
      return {
        ...serializeDataroom(row),
        storageBytes: s?.storageBytes ?? 0,
        folderCount: s?.folderCount ?? 0,
        fileCount: s?.fileCount ?? 0,
        starred: starredIds.has(row.id),
      };
    });
  }

  async createDataroom(userId: string, name: string): Promise<Dataroom> {
    const row = await this.prisma.dataroom.create({ data: { name, ownerId: userId } });
    return serializeDataroom(row);
  }

  async renameDataroom(userId: string, dataroomId: string, name: string): Promise<Dataroom> {
    const result = await this.prisma.dataroom.updateMany({
      where: { id: dataroomId, ownerId: userId, deletedAt: null },
      data: { name, updatedAt: new Date() },
    });
    if (result.count === 0) throw ApiException.notFound("Data room");
    const row = await this.prisma.dataroom.findUniqueOrThrow({ where: { id: dataroomId } });
    return serializeDataroom(row);
  }

  async deleteDataroom(userId: string, dataroomId: string): Promise<void> {
    const row = await this.prisma.dataroom.findFirst({
      where: { id: dataroomId, ownerId: userId, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw ApiException.notFound("Data room");
    await this.softDeleteDataroom(dataroomId);
  }

  // Deleting a dataroom only flips its own deletedAt — it does not touch the deletedAt of
  // folders/files inside it. Those keep whatever trash state they already had, so restoring
  // the dataroom doesn't resurrect things that were independently trashed beforehand. A
  // deleted dataroom has no parent, so it's always its own trash root.
  async softDeleteDataroom(dataroomId: string): Promise<void> {
    await this.prisma.dataroom.update({
      where: { id: dataroomId },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
  }

  async restoreDataroomById(userId: string, dataroomId: string): Promise<void> {
    const result = await this.prisma.dataroom.updateMany({
      where: { id: dataroomId, ownerId: userId },
      data: { deletedAt: null, updatedAt: new Date() },
    });
    if (result.count === 0) throw ApiException.notFound("Data room");
  }

  // Internal — called only after the caller (trash service, this service) has already
  // verified ownership, e.g. via a scoped listTrash/restore lookup. No userId param.
  async purgeDataroomPermanently(dataroomId: string): Promise<void> {
    const filesInDataroom = await this.prisma.file.findMany({
      where: { dataroomId },
      select: { blobPathname: true },
    });
    await this.blobService.deleteBlobs(filesInDataroom.map((f) => f.blobPathname));
    // FK ON DELETE CASCADE removes every folder/file row under it.
    await this.prisma.dataroom.delete({ where: { id: dataroomId } });
  }

  async getDataroomContents(
    userId: string,
    dataroomId: string,
    folderId: string | undefined,
    search: string | undefined,
  ): Promise<FolderContents> {
    const dataroomRow = await this.prisma.dataroom.findFirst({
      where: { id: dataroomId, ownerId: userId, deletedAt: null },
    });
    if (!dataroomRow) throw ApiException.notFound("Data room");

    let folder: Folder | null = null;
    let breadcrumbs: Array<{ id: string; name: string }> = [];
    if (folderId) {
      const folderRow = await this.prisma.folder.findFirst({
        where: { id: folderId, dataroomId, deletedAt: null },
      });
      if (!folderRow) throw ApiException.notFound("Folder");
      folder = serializeFolderPlain(folderRow);
      breadcrumbs = await this.getBreadcrumbs(folderId);
    }

    const [starredFolderIds, starredFileIds] = await Promise.all([
      this.starredService.getStarredIds(userId, "folder"),
      this.starredService.getStarredIds(userId, "file"),
    ]);

    const folderWhere = search
      ? { dataroomId, deletedAt: null, name: { contains: search, mode: "insensitive" as const } }
      : { dataroomId, deletedAt: null, parentFolderId: folderId ?? null };
    const fileWhere = search
      ? { dataroomId, deletedAt: null, name: { contains: search, mode: "insensitive" as const } }
      : { dataroomId, deletedAt: null, folderId: folderId ?? null };

    const [folderRows, fileRows] = await Promise.all([
      this.prisma.folder.findMany({ where: folderWhere }),
      this.prisma.file.findMany({ where: fileWhere }),
    ]);

    const entries: BrowserEntry[] = [
      ...folderRows.map((f) => serializeFolderEntry(f, starredFolderIds.has(f.id))),
      ...fileRows.map((f) => serializeFileEntry(f, starredFileIds.has(f.id))),
    ];

    return { dataroom: serializeDataroom(dataroomRow), folder, breadcrumbs, entries };
  }
}
