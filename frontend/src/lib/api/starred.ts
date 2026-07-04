import { api } from "./client";
import type { EntityType, StarredEntry } from "@shared/types";

export function listStarred() {
  return api.get<StarredEntry[]>("/starred");
}

export function starEntity(entityType: EntityType, entityId: string) {
  return api.post<void>("/starred", { entityType, entityId });
}

export function unstarEntity(entityType: EntityType, entityId: string) {
  return api.delete<void>(`/starred/${entityType}/${entityId}`);
}
