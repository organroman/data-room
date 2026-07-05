import { sql, and, eq, isNull, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import { datarooms, folders, files } from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { serializeFolderPlain } from "../lib/serialize.js";
import { deleteBlobs } from "../lib/blob.js";
import type { Folder } from "@shared/types";

const NAME_CONFLICT_MESSAGE = "An item with this name already exists in this location.";

/**
 * A deleted folder is a "trash root" — the thing that shows up as its own row
 * in the Trash view — when it has no live parent folder. If its parent is also
 * deleted, it was swept up in the parent's deletion and should appear nested
 * under the parent's trash entry instead of as its own row.
 */
export const folderIsTrashRoot = sql`
  ${folders.deletedAt} is not null
  and not exists (
    select 1 from folders parent
    where parent.id = ${folders.parentFolderId} and parent.deleted_at is not null
  )
`;

async function getDescendantFolderIds(rootFolderId: string): Promise<string[]> {
  const result = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM folders WHERE id = ${rootFolderId}
      UNION ALL
      SELECT f.id FROM folders f JOIN descendants d ON f.parent_folder_id = d.id
    )
    SELECT id FROM descendants
  `);
  return result.rows.map((row) => row.id);
}

export async function createFolder(
  dataroomId: string,
  parentFolderId: string | null,
  name: string,
): Promise<Folder> {
  const [dataroom] = await db
    .select({ id: datarooms.id })
    .from(datarooms)
    .where(and(eq(datarooms.id, dataroomId), isNull(datarooms.deletedAt)));
  if (!dataroom) throw ApiError.notFound("Data room");

  if (parentFolderId) {
    const [parent] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, parentFolderId), eq(folders.dataroomId, dataroomId), isNull(folders.deletedAt)));
    if (!parent) throw ApiError.notFound("Parent folder");
  }

  try {
    const [row] = await db.insert(folders).values({ dataroomId, parentFolderId, name }).returning();
    return serializeFolderPlain(row);
  } catch (err) {
    if (isUniqueViolation(err, "folders_unique_name_per_parent")) {
      throw ApiError.conflict(NAME_CONFLICT_MESSAGE);
    }
    throw err;
  }
}

export async function renameFolder(folderId: string, name: string): Promise<Folder> {
  try {
    const [row] = await db
      .update(folders)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(folders.id, folderId), isNull(folders.deletedAt)))
      .returning();
    if (!row) throw ApiError.notFound("Folder");
    return serializeFolderPlain(row);
  } catch (err) {
    if (isUniqueViolation(err, "folders_unique_name_per_parent")) {
      throw ApiError.conflict(NAME_CONFLICT_MESSAGE);
    }
    throw err;
  }
}

export async function deleteFolder(folderId: string): Promise<void> {
  const [row] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), isNull(folders.deletedAt)));
  if (!row) throw ApiError.notFound("Folder");
  await softDeleteFolder(folderId);
}

export async function softDeleteFolder(folderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const ids = await getDescendantFolderIds(folderId);
    const now = new Date();
    await tx.update(folders).set({ deletedAt: now, updatedAt: now }).where(inArray(folders.id, ids));
    await tx.update(files).set({ deletedAt: now, updatedAt: now }).where(inArray(files.folderId, ids));
  });
}

export async function restoreFolderById(folderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const ids = await getDescendantFolderIds(folderId);
    const now = new Date();
    await tx.update(folders).set({ deletedAt: null, updatedAt: now }).where(inArray(folders.id, ids));
    await tx.update(files).set({ deletedAt: null, updatedAt: now }).where(inArray(files.folderId, ids));
  });
}

export async function purgeFolderPermanently(folderId: string): Promise<void> {
  const ids = await getDescendantFolderIds(folderId);
  const filesInSubtree = await db
    .select({ blobPathname: files.blobPathname })
    .from(files)
    .where(inArray(files.folderId, ids));

  await deleteBlobs(filesInSubtree.map((f) => f.blobPathname));
  // Deleting the root folder cascades to descendant folders and their files at
  // the FK level (ON DELETE CASCADE), so only the root row needs removing here.
  await db.delete(folders).where(eq(folders.id, folderId));
}
