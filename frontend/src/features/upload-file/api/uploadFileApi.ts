import { upload } from "@vercel/blob/client";
import { api, API_BASE } from "@/shared/api/client";
import type { FileEntry } from "@shared/types";

export async function uploadFile(
  dataroomId: string,
  folderId: string | null,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<{ file: FileEntry; renamed: boolean }> {
  const blob = await upload(file.name, file, {
    access: "public",
    // Relative "/api/..." resolves against the *page's* origin, not the backend's — harmless
    // locally (Vite proxies /api to the Nest backend, same-origin), but in production the
    // frontend (Vercel) and backend (Render) are genuinely different origins, so this needs
    // the same API_BASE prefix shared/api/client.ts's own request() uses.
    handleUploadUrl: `${API_BASE}/api/files/upload-url`,
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
