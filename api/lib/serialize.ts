import type { DataroomRow, FolderRow, FileRow } from "../db/schema";
import type { Dataroom, Folder, FolderEntry, FileEntry } from "@shared/types";

export function serializeDataroom(row: DataroomRow): Dataroom {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeFolderPlain(row: FolderRow): Folder {
  return {
    id: row.id,
    dataroomId: row.dataroomId,
    parentFolderId: row.parentFolderId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeFolderEntry(row: FolderRow, starred: boolean): FolderEntry {
  return { ...serializeFolderPlain(row), type: "folder", starred };
}

export function serializeFileEntry(row: FileRow, starred: boolean): FileEntry {
  return {
    type: "file",
    id: row.id,
    dataroomId: row.dataroomId,
    folderId: row.folderId,
    name: row.name,
    size: row.size,
    mimeType: row.mimeType,
    blobUrl: row.blobUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    starred,
  };
}
