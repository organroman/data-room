import { api } from "@/shared/api/client";
import type { Folder, FolderSubtreeStats } from "@shared/types";

export function createFolder(dataroomId: string, parentFolderId: string | null, name: string) {
  return api.post<Folder>("/folders", { dataroomId, parentFolderId, name });
}

export function renameFolder(folderId: string, name: string) {
  return api.patch<Folder>(`/folders/${folderId}`, { name });
}

export function deleteFolder(folderId: string) {
  return api.delete<void>(`/folders/${folderId}`);
}

export function bulkDeleteFolders(ids: string[]) {
  return api.post<void>("/folders/bulk-delete", { ids });
}

export function restoreFolder(folderId: string) {
  return api.post<void>(`/folders/${folderId}/restore`);
}

export function getSubtreeStats(folderId: string) {
  return api.get<FolderSubtreeStats>(`/folders/${folderId}/subtree-stats`);
}
