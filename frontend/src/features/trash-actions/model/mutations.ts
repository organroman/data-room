import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/trashApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { EntityType } from "@shared/types";

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
