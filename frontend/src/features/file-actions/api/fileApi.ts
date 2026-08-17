import { api, toQueryString } from "@/shared/api/client";
import type { BulkMoveResult, FileEntry, FolderContents, FolderEntry } from "@shared/types";

export function renameFile(fileId: string, name: string) {
  return api.patch<FileEntry>(`/files/${fileId}`, { name });
}

export function moveFile(fileId: string, folderId: string | null) {
  return api.patch<FileEntry>(`/files/${fileId}/move`, { folderId });
}

/**
 * Folders directly inside `folderId` (or the data room root, if omitted) — for the
 * folder-tree-picker (MoveFileDialog). Reuses the existing dataroom-contents endpoint
 * (owned by the dataroom-actions feature) rather than importing from it, since shared/*
 * and cross-feature imports aren't allowed to reach into another feature's api layer under
 * this app's Feature-Sliced Design conventions — see CLAUDE.md's Phase 5 implementation notes.
 */
export async function listSubfolders(dataroomId: string, folderId?: string): Promise<FolderEntry[]> {
  const qs = toQueryString({ folderId });
  const contents = await api.get<FolderContents>(`/datarooms/${dataroomId}/contents${qs}`);
  return contents.entries.filter((entry): entry is FolderEntry => entry.type === "folder");
}

export function deleteFile(fileId: string) {
  return api.delete<void>(`/files/${fileId}`);
}

export function bulkDeleteFiles(ids: string[]) {
  return api.post<void>("/files/bulk-delete", { ids });
}

export function bulkMoveFiles(ids: string[], folderId: string | null) {
  return api.patch<BulkMoveResult>("/files/bulk-move", { ids, folderId });
}

export function restoreFile(fileId: string) {
  return api.post<void>(`/files/${fileId}/restore`);
}

export function getFile(fileId: string, token?: string) {
  const qs = toQueryString({ token });
  return api.get<FileEntry>(`/files/${fileId}${qs}`);
}
