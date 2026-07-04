import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/starred";
import { queryKeys } from "../queryKeys";
import type { EntityType } from "@shared/types";

export function useStarred() {
  return useQuery({ queryKey: queryKeys.starred, queryFn: api.listStarred });
}

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
