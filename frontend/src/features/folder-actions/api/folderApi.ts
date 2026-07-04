import { api } from "@/shared/api/client";
import type { Folder } from "@shared/types";

export function createFolder(dataroomId: string, parentFolderId: string | null, name: string) {
  return api.post<Folder>("/folders", { dataroomId, parentFolderId, name });
}

export function renameFolder(folderId: string, name: string) {
  return api.patch<Folder>(`/folders/${folderId}`, { name });
}

export function deleteFolder(folderId: string) {
  return api.delete<void>(`/folders/${folderId}`);
}

export function restoreFolder(folderId: string) {
  return api.post<void>(`/folders/${folderId}/restore`);
}
