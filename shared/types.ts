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
  // Set on single-file reads (getFileById) — same purpose as FolderContents.isOwner.
  // Omitted from list contexts (dataroom contents, starred) where it isn't needed per-row.
  isOwner?: boolean;
}

export type BrowserEntry = FolderEntry | FileEntry;

export interface FolderContents {
  dataroom: Dataroom;
  folder: Folder | null; // null = root
  breadcrumbs: Array<Pick<Folder, "id" | "name">>;
  entries: BrowserEntry[];
  // Whether the requesting principal owns this dataroom, vs. viewing it via a share —
  // the frontend uses this to decide whether to render mutating UI (upload, rename, etc.).
  isOwner: boolean;
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

export type ShareMode = "public" | "permissioned";

export interface ShareGrantee {
  /** ShareGrant row id (used to revoke just this one grantee). */
  id: string;
  userId: string;
  email: string;
  name: string;
}

export interface ShareSummary {
  id: string;
  resourceType: EntityType;
  resourceId: string;
  mode: ShareMode;
  /** Present only for mode "public". */
  token: string | null;
  createdAt: string;
  expiresAt: string | null;
  /** Present only for mode "permissioned". */
  grantees: ShareGrantee[];
}

export interface SharedWithMeEntry {
  shareId: string;
  entityType: EntityType;
  entityId: string;
  dataroomId: string;
  dataroomName: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  // present only when entityType is "file"
  folderId?: string | null;
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

export interface MoveFileInput {
  /** Destination folder, or null to move to the data room root. */
  folderId: string | null;
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

export interface CreateShareInput {
  resourceType: EntityType;
  resourceId: string;
  mode: ShareMode;
  /** ISO datetime string, or null for "never expires". Ignored for mode "permissioned". */
  expiresAt?: string | null;
  /** Registered users to grant access to, by email. Ignored for mode "public". */
  granteeEmails?: string[];
}

export interface SharesQuery {
  resourceType: EntityType;
  resourceId: string;
}
