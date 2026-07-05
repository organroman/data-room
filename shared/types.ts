export type EntityType = "dataroom" | "folder" | "file";

export interface Dataroom {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataroomSummary extends Dataroom {
  storageBytes: number;
  folderCount: number;
  fileCount: number;
  starred: boolean;
}

export interface Folder {
  id: string;
  dataroomId: string;
  parentFolderId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderEntry extends Folder {
  type: "folder";
  starred: boolean;
}

export interface FileEntry {
  id: string;
  type: "file";
  dataroomId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  blobUrl: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
}

export type BrowserEntry = FolderEntry | FileEntry;

export interface FolderContents {
  dataroom: Dataroom;
  folder: Folder | null; // null = root
  breadcrumbs: Array<Pick<Folder, "id" | "name">>;
  entries: BrowserEntry[];
}

export interface TrashEntry {
  id: string;
  type: EntityType;
  dataroomId: string;
  dataroomName: string;
  name: string;
  deletedAt: string;
}

export interface StarredEntry {
  entityType: EntityType;
  entityId: string;
  dataroomId: string;
  dataroomName: string;
  name: string;
  // present only when entityType is "file" — the file's parent folder (null = dataroom root),
  // needed to build the correct nested vs. root preview URL.
  folderId?: string | null;
  // present only when entityType is "file"
  mimeType?: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

// Request/query DTOs — the contract shared by the frontend api client and the
// backend's zod validators (validation.ts asserts its schemas match these).
// Create/rename name-only bodies use NameInput from ./validation instead of a
// dedicated interface here, since nameSchema is their single source of truth.

export interface CreateFolderInput {
  dataroomId: string;
  parentFolderId: string | null;
  name: string;
}

export interface ContentsQuery {
  folderId?: string;
  search?: string;
}

export interface ConfirmUploadInput {
  dataroomId: string;
  folderId: string | null;
  name: string;
  size: number;
  blobUrl: string;
  blobPathname: string;
}

export interface StarEntityInput {
  entityType: EntityType;
  entityId: string;
}

export interface TrashQuery {
  dataroomId?: string;
}
