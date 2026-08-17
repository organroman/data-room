import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/shareApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { CreateShareInput, EntityType } from "@shared/types";

export function useCreateShare(resourceType: EntityType, resourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShareInput) => api.createShare(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shares(resourceType, resourceId) }),
  });
}

export function useRevokeShare(resourceType: EntityType, resourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) => api.revokeShare(shareId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shares(resourceType, resourceId) }),
  });
}

export function useRevokeGrant(resourceType: EntityType, resourceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shareId, grantId }: { shareId: string; grantId: string }) => api.revokeGrant(shareId, grantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shares(resourceType, resourceId) }),
  });
}
