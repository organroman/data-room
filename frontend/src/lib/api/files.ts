import { upload } from "@vercel/blob/client";
import { api } from "./client";
import type { FileEntry } from "@shared/types";

export async function uploadFile(
  dataroomId: string,
  folderId: string | null,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<{ file: FileEntry; renamed: boolean }> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/files/upload-url",
    onUploadProgress: ({ percentage }) => onProgress?.(percentage),
  });

  return api.post<{ file: FileEntry; renamed: boolean }>("/files/confirm", {
    dataroomId,
    folderId,
    name: file.name,
    size: file.size,
    blobUrl: blob.url,
    blobPathname: blob.pathname,
  });
}

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
