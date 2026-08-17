import type { EntityType } from "@shared/types";

/** The in-app route for a dataroom/folder/file entity — shared by StarredRow and SharedWithMeRow. */
export function buildEntryLink(
  entityType: EntityType,
  entityId: string,
  dataroomId: string,
  folderId?: string | null,
): string {
  if (entityType === "dataroom") return `/datarooms/${dataroomId}`;
  if (entityType === "folder") return `/datarooms/${dataroomId}/folders/${entityId}`;
  return folderId
    ? `/datarooms/${dataroomId}/folders/${folderId}/files/${entityId}`
    : `/datarooms/${dataroomId}/files/${entityId}`;
}
