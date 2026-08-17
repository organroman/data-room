import type { EntityType } from "@shared/types";

export const queryKeys = {
  // Invalidating this prefix refetches both the dashboard list and every
  // dataroom's contents view — TanStack Query matches by key prefix, and
  // `dataroomContents` keys all start with "datarooms" too.
  datarooms: ["datarooms"] as const,
  // token included so an anonymous public-link view and an owner's authenticated view of the
  // same dataroomId never share a cache entry (isOwner and available entries can differ).
  dataroomContents: (dataroomId: string, folderId?: string, search?: string, token?: string) =>
    ["datarooms", dataroomId, "contents", folderId ?? "root", search ?? "", token ?? ""] as const,
  trash: ["trash"] as const,
  starred: ["starred"] as const,
  shares: (resourceType: EntityType, resourceId: string) => ["shares", resourceType, resourceId] as const,
  sharedWithMe: ["shares", "shared-with-me"] as const,
  activity: (dataroomId: string) => ["datarooms", dataroomId, "activity"] as const,
};
