import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/folders";
import { queryKeys } from "../queryKeys";

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dataroomId,
      parentFolderId,
      name,
    }: {
      dataroomId: string;
      parentFolderId: string | null;
      name: string;
    }) => api.createFolder(dataroomId, parentFolderId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.datarooms }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) => api.renameFolder(folderId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.datarooms }),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => api.deleteFolder(folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}

export function useRestoreFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => api.restoreFolder(folderId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}
