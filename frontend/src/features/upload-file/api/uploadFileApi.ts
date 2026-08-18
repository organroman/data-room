import { put } from "@vercel/blob/client";
import { api } from "@/shared/api/client";
import type { FileEntry, GenerateUploadTokenResult } from "@shared/types";

export async function uploadFile(
  dataroomId: string,
  folderId: string | null,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<{ file: FileEntry; renamed: boolean }> {
  // Two steps, not @vercel/blob/client's all-in-one upload() convenience helper: upload()
  // fetches the token itself via its own internal request, which has no way to set
  // credentials: "include" — fine same-origin, but breaks cross-origin in production (frontend
  // on Vercel, backend on Render) since the session cookie never gets attached, and the
  // backend's AuthGuard 401s. Fetching the token through our own `api` client first (which does
  // set credentials: "include") keeps the browser->backend leg authenticated; the browser->blob
  // storage PUT that follows doesn't touch our backend at all, so it was never the problem.
  const { token } = await api.post<GenerateUploadTokenResult>("/files/upload-url", {
    pathname: file.name,
  });

  const blob = await put(file.name, file, {
    access: "public",
    token,
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
