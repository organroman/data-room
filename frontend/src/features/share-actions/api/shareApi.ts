import { api, toQueryString } from "@/shared/api/client";
import type { CreateShareInput, EntityType, ResolvedShare, SharedWithMeEntry, ShareSummary } from "@shared/types";

export function listShares(resourceType: EntityType, resourceId: string) {
  const qs = toQueryString({ resourceType, resourceId });
  return api.get<ShareSummary[]>(`/shares${qs}`);
}

export function createShare(input: CreateShareInput) {
  return api.post<ShareSummary>("/shares", input);
}

export function revokeShare(shareId: string) {
  return api.delete<void>(`/shares/${shareId}`);
}

export function revokeGrant(shareId: string, grantId: string) {
  return api.delete<void>(`/shares/${shareId}/grants/${grantId}`);
}

export function listSharedWithMe() {
  return api.get<SharedWithMeEntry[]>("/shares/shared-with-me");
}

export function resolveShareToken(token: string) {
  return api.get<ResolvedShare>(`/shares/token/${token}/resolve`);
}
