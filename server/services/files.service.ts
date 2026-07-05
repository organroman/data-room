import { sql, and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { datarooms, folders, files } from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import { isUniqueViolation } from "../lib/db-errors.js";
import { serializeFileEntry } from "../lib/serialize.js";
import { deleteBlobs } from "../lib/blob.js";
import { getStarredIds } from "./starred.service.js";
import type { FileEntry } from "@shared/types";

const NAME_CONFLICT_MESSAGE = "An item with this name already exists in this location.";
const MAX_NAME_RESOLUTION_ATTEMPTS = 5;

/**
 * A deleted file is a "trash root" when its parent folder isn't also deleted
 * (files with no folder, i.e. dataroom-root files, are always roots). Mirrors
 * folderIsTrashRoot in folders.service.ts.
 */
export const fileIsTrashRoot = sql`
  ${files.deletedAt} is not null
  and not exists (
    select 1 from folders parent
    where parent.id = ${files.folderId} and parent.deleted_at is not null
  )
`;

function splitExtension(name: string): { base: string; ext: string } {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, dotIndex), ext: name.slice(dotIndex) };
}

/**
 * Resolves a file name to one that doesn't collide with a live sibling in the
 * same folder, auto-suffixing "(1)", "(2)", ... before the extension. Used only
 * for uploads (screen 9 in the mockup); renames reject on collision instead.
 */
async function resolveUniqueFileName(
  dataroomId: string,
  folderId: string | null,
  desiredName: string,
): Promise<{ name: string; renamed: boolean }> {
  const siblingCondition = folderId ? eq(files.folderId, folderId) : isNull(files.folderId);
  const existing = await db
    .select({ name: files.name })
    .from(files)
    .where(and(eq(files.dataroomId, dataroomId), siblingCondition, isNull(files.deletedAt)));

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

export async function confirmFileUpload(input: {
  dataroomId: string;
  folderId: string | null;
  name: string;
  size: number;
  blobUrl: string;
  blobPathname: string;
}): Promise<{ file: FileEntry; renamed: boolean }> {
  const [dataroom] = await db
    .select({ id: datarooms.id })
    .from(datarooms)
    .where(and(eq(datarooms.id, input.dataroomId), isNull(datarooms.deletedAt)));
  if (!dataroom) throw ApiError.notFound("Data room");

  if (input.folderId) {
    const [folder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(
        and(eq(folders.id, input.folderId), eq(folders.dataroomId, input.dataroomId), isNull(folders.deletedAt)),
      );
    if (!folder) throw ApiError.notFound("Folder");
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_NAME_RESOLUTION_ATTEMPTS; attempt++) {
    const { name, renamed } = await resolveUniqueFileName(input.dataroomId, input.folderId, input.name);
    try {
      const [row] = await db
        .insert(files)
        .values({
          dataroomId: input.dataroomId,
          folderId: input.folderId,
          name,
          size: input.size,
          blobUrl: input.blobUrl,
          blobPathname: input.blobPathname,
        })
        .returning();
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

export async function renameFile(fileId: string, name: string): Promise<FileEntry> {
  try {
    const [row] = await db
      .update(files)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(files.id, fileId), isNull(files.deletedAt)))
      .returning();
    if (!row) throw ApiError.notFound("File");
    const starredIds = await getStarredIds("file");
    return serializeFileEntry(row, starredIds.has(row.id));
  } catch (err) {
    if (isUniqueViolation(err, "files_unique_name_per_parent")) {
      throw ApiError.conflict(NAME_CONFLICT_MESSAGE);
    }
    throw err;
  }
}

export async function deleteFile(fileId: string): Promise<void> {
  const now = new Date();
  const [row] = await db
    .update(files)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(files.id, fileId), isNull(files.deletedAt)))
    .returning({ id: files.id });
  if (!row) throw ApiError.notFound("File");
}

export async function restoreFile(fileId: string): Promise<void> {
  await db
    .update(files)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(files.id, fileId));
}

export async function purgeFilePermanently(fileId: string): Promise<void> {
  const [file] = await db.select({ blobPathname: files.blobPathname }).from(files).where(eq(files.id, fileId));
  if (!file) return;
  await deleteBlobs([file.blobPathname]);
  await db.delete(files).where(eq(files.id, fileId));
}

export async function getFileById(fileId: string): Promise<FileEntry> {
  const [row] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), isNull(files.deletedAt)));
  if (!row) throw ApiError.notFound("File");
  const starredIds = await getStarredIds("file");
  return serializeFileEntry(row, starredIds.has(row.id));
}
