import { useQuery } from "@tanstack/react-query";
import * as api from "../api/fileApi";

export function useFile(fileId: string) {
  return useQuery({
    queryKey: ["datarooms", "files", fileId],
    queryFn: () => api.getFile(fileId),
    enabled: Boolean(fileId),
  });
}

/** Direct children of `folderId` (or the data room root) — powers the folder-tree-picker, one level at a time. */
export function useSubfolders(dataroomId: string, folderId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["datarooms", dataroomId, "folder-tree", folderId ?? "root"],
    queryFn: () => api.listSubfolders(dataroomId, folderId),
    enabled,
  });
}
