import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/starredApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { EntityType } from "@shared/types";

export function useStarEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: EntityType; entityId: string }) =>
      api.starEntity(entityType, entityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.starred });
    },
  });
}

export function useUnstarEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId }: { entityType: EntityType; entityId: string }) =>
      api.unstarEntity(entityType, entityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.datarooms });
      qc.invalidateQueries({ queryKey: queryKeys.starred });
    },
  });
}
