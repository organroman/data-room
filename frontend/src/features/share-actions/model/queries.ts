import { useQuery } from "@tanstack/react-query";
import * as api from "../api/shareApi";
import { queryKeys } from "@/shared/api/queryKeys";
import type { EntityType } from "@shared/types";

/** Only fetched while the ShareDialog for this resource is open. */
export function useShares(resourceType: EntityType, resourceId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.shares(resourceType, resourceId),
    queryFn: () => api.listShares(resourceType, resourceId),
    enabled,
  });
}

export function useSharedWithMe() {
  return useQuery({
    queryKey: queryKeys.sharedWithMe,
    queryFn: api.listSharedWithMe,
  });
}
