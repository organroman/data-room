import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/uploadFileApi";
import { queryKeys } from "@/shared/api/queryKeys";

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
