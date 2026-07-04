import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/trash";
import { queryKeys } from "../queryKeys";
import type { EntityType } from "@shared/types";

export function useTrash(dataroomId?: string) {
  return useQuery({
    queryKey: [...queryKeys.trash, dataroomId ?? "all"],
    queryFn: () => api.listTrash(dataroomId),
  });
}

export function useRestoreTrashEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id }: { type: EntityType; id: string }) => api.restoreTrashEntry(type, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.trash });
    },
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dataroomId?: string) => api.emptyTrash(dataroomId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trash }),
  });
}
