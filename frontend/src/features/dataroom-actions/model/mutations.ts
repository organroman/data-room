import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/dataroomApi";
import { queryKeys } from "@/shared/api/queryKeys";

export function useCreateDataroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createDataroom(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.datarooms }),
  });
}

export function useRenameDataroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dataroomId, name }: { dataroomId: string; name: string }) =>
      api.renameDataroom(dataroomId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.datarooms }),
  });
}

export function useDeleteDataroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dataroomId: string) => api.deleteDataroom(dataroomId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}

export function useRestoreDataroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dataroomId: string) => api.restoreDataroom(dataroomId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}
