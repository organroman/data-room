import type {
  Dataroom as DataroomRow,
  Folder as FolderRow,
  File as FileRow,
} from "@prisma/client";
import type { Dataroom, Folder, FolderEntry, FileEntry } from "../../../shared/types.js";

// Pure row -> DTO mappers, 1:1 port of v1's server/lib/serialize.ts. The only real
// difference from the Drizzle version is `size`: Prisma maps a BigInt column to JS
// `bigint`, so it needs an explicit Number() conversion at this DTO boundary (fine up to
// 2^53 bytes, far beyond the app's 100MB upload limit).

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
    size: Number(row.size),
    mimeType: row.mimeType,
    blobUrl: row.blobUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    starred,
  };
}
