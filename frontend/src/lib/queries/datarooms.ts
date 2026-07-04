import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/datarooms";
import { queryKeys } from "../queryKeys";

export function useDatarooms() {
  return useQuery({ queryKey: queryKeys.datarooms, queryFn: api.listDatarooms });
}

export function useDataroomContents(dataroomId: string, folderId?: string, search?: string) {
  return useQuery({
    queryKey: queryKeys.dataroomContents(dataroomId, folderId, search),
    queryFn: () => api.getDataroomContents(dataroomId, folderId, search),
    enabled: Boolean(dataroomId),
  });
}

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
