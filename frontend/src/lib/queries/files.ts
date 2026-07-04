import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/files";
import { queryKeys } from "../queryKeys";

export function useUploadFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dataroomId,
      folderId,
      file,
      onProgress,
    }: {
      dataroomId: string;
      folderId: string | null;
      file: File;
      onProgress?: (percentage: number) => void;
    }) => api.uploadFile(dataroomId, folderId, file, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.datarooms }),
  });
}

export function useRenameFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, name }: { fileId: string; name: string }) => api.renameFile(fileId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.datarooms }),
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => api.deleteFile(fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}

export function useRestoreFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => api.restoreFile(fileId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}
