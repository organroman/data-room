import { sql, and, eq, isNull, ilike } from "drizzle-orm";
import { db } from "../db/client";
import { datarooms, folders, files } from "../db/schema";
import { ApiError } from "../lib/errors";
import { deleteBlobs } from "../lib/blob";
import { serializeDataroom, serializeFolderPlain, serializeFolderEntry, serializeFileEntry } from "../lib/serialize";
import { getStarredIds } from "./starred.service";
import type { Dataroom, DataroomSummary, FolderContents, BrowserEntry } from "@shared/types";

interface DataroomStats {
  storageBytes: number;
  folderCount: number;
  fileCount: number;
}

/** Storage/item counts per dataroom, live (non-deleted) items only. */
async function getDataroomStats(): Promise<Map<string, DataroomStats>> {
  const result = await db.execute<{
    dataroom_id: string;
    storage_bytes: string;
    folder_count: string;
    file_count: string;
  }>(sql`
    SELECT
      d.id AS dataroom_id,
      coalesce(f.storage_bytes, 0) AS storage_bytes,
      coalesce(fo.folder_count, 0) AS folder_count,
      coalesce(f.file_count, 0) AS file_count
    FROM datarooms d
    LEFT JOIN (
      SELECT dataroom_id, sum(size) AS storage_bytes, count(*) AS file_count
      FROM files WHERE deleted_at IS NULL GROUP BY dataroom_id
    ) f ON f.dataroom_id = d.id
    LEFT JOIN (
      SELECT dataroom_id, count(*) AS folder_count
      FROM folders WHERE deleted_at IS NULL GROUP BY dataroom_id
    ) fo ON fo.dataroom_id = d.id
    WHERE d.deleted_at IS NULL
  `);

  const stats = new Map<string, DataroomStats>();
  for (const row of result.rows) {
    stats.set(row.dataroom_id, {
      storageBytes: Number(row.storage_bytes),
      folderCount: Number(row.folder_count),
      fileCount: Number(row.file_count),
    });
  }
  return stats;
}

async function getBreadcrumbs(folderId: string): Promise<Array<{ id: string; name: string }>> {
  const result = await db.execute<{ id: string; name: string }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_folder_id, name, 0 AS depth FROM folders WHERE id = ${folderId}
      UNION ALL
      SELECT f.id, f.parent_folder_id, f.name, a.depth + 1
      FROM folders f JOIN ancestors a ON f.id = a.parent_folder_id
    )
    SELECT id, name FROM ancestors ORDER BY depth DESC
  `);
  return result.rows;
}

export async function listDatarooms(): Promise<DataroomSummary[]> {
  const [rows, stats, starredIds] = await Promise.all([
    db.select().from(datarooms).where(isNull(datarooms.deletedAt)).orderBy(datarooms.updatedAt),
    getDataroomStats(),
    getStarredIds("dataroom"),
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

export async function createDataroom(name: string): Promise<Dataroom> {
  const [row] = await db.insert(datarooms).values({ name }).returning();
  return serializeDataroom(row);
}

export async function renameDataroom(dataroomId: string, name: string): Promise<Dataroom> {
  const [row] = await db
    .update(datarooms)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(datarooms.id, dataroomId), isNull(datarooms.deletedAt)))
    .returning();
  if (!row) throw ApiError.notFound("Data room");
  return serializeDataroom(row);
}

export async function deleteDataroom(dataroomId: string): Promise<void> {
  const [row] = await db
    .select({ id: datarooms.id })
    .from(datarooms)
    .where(and(eq(datarooms.id, dataroomId), isNull(datarooms.deletedAt)));
  if (!row) throw ApiError.notFound("Data room");
  await softDeleteDataroom(dataroomId);
}

// Deleting a dataroom only flips its own deleted_at — it does not touch the
// deleted_at of folders/files inside it. Those keep whatever trash state they
// already had, so restoring the dataroom doesn't resurrect things that were
// independently trashed beforehand. A deleted dataroom has no parent, so it's
// always its own trash root.
export async function softDeleteDataroom(dataroomId: string): Promise<void> {
  await db
    .update(datarooms)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(datarooms.id, dataroomId));
}

export async function restoreDataroomById(dataroomId: string): Promise<void> {
  await db
    .update(datarooms)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(datarooms.id, dataroomId));
}

export async function purgeDataroomPermanently(dataroomId: string): Promise<void> {
  const filesInDataroom = await db
    .select({ blobPathname: files.blobPathname })
    .from(files)
    .where(eq(files.dataroomId, dataroomId));
  await deleteBlobs(filesInDataroom.map((f) => f.blobPathname));
  // FK ON DELETE CASCADE removes every folder/file row under it.
  await db.delete(datarooms).where(eq(datarooms.id, dataroomId));
}

export async function getDataroomContents(
  dataroomId: string,
  folderId: string | undefined,
  search: string | undefined,
): Promise<FolderContents> {
  const [dataroomRow] = await db
    .select()
    .from(datarooms)
    .where(and(eq(datarooms.id, dataroomId), isNull(datarooms.deletedAt)));
  if (!dataroomRow) throw ApiError.notFound("Data room");

  let folder = null;
  let breadcrumbs: Array<{ id: string; name: string }> = [];
  if (folderId) {
    const [folderRow] = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.dataroomId, dataroomId), isNull(folders.deletedAt)));
    if (!folderRow) throw ApiError.notFound("Folder");
    folder = serializeFolderPlain(folderRow);
    breadcrumbs = await getBreadcrumbs(folderId);
  }

  const [starredFolderIds, starredFileIds] = await Promise.all([
    getStarredIds("folder"),
    getStarredIds("file"),
  ]);

  const folderCondition = search
    ? and(eq(folders.dataroomId, dataroomId), isNull(folders.deletedAt), ilike(folders.name, `%${search}%`))
    : and(
        eq(folders.dataroomId, dataroomId),
        isNull(folders.deletedAt),
        folderId ? eq(folders.parentFolderId, folderId) : isNull(folders.parentFolderId),
      );
  const fileCondition = search
    ? and(eq(files.dataroomId, dataroomId), isNull(files.deletedAt), ilike(files.name, `%${search}%`))
    : and(
        eq(files.dataroomId, dataroomId),
        isNull(files.deletedAt),
        folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
      );

  const [folderRows, fileRows] = await Promise.all([
    db.select().from(folders).where(folderCondition),
    db.select().from(files).where(fileCondition),
  ]);

  const entries: BrowserEntry[] = [
    ...folderRows.map((f) => serializeFolderEntry(f, starredFolderIds.has(f.id))),
    ...fileRows.map((f) => serializeFileEntry(f, starredFileIds.has(f.id))),
  ];

  return { dataroom: serializeDataroom(dataroomRow), folder, breadcrumbs, entries };
}
