import { api } from "@/shared/api/client";
import type { FileEntry } from "@shared/types";

export function renameFile(fileId: string, name: string) {
  return api.patch<FileEntry>(`/files/${fileId}`, { name });
}

export function deleteFile(fileId: string) {
  return api.delete<void>(`/files/${fileId}`);
}

export function restoreFile(fileId: string) {
  return api.post<void>(`/files/${fileId}/restore`);
}

export function getFile(fileId: string) {
  return api.get<FileEntry>(`/files/${fileId}`);
}
