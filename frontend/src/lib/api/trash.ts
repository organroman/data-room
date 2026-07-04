import { api, toQueryString } from "./client";
import type { EntityType, TrashEntry } from "@shared/types";

export function listTrash(dataroomId?: string) {
  return api.get<TrashEntry[]>(`/trash${toQueryString({ dataroomId })}`);
}

export function restoreTrashEntry(type: EntityType, id: string) {
  return api.post<void>(`/trash/${type}/${id}/restore`);
}

export function emptyTrash(dataroomId?: string) {
  return api.post<void>(`/trash/empty${toQueryString({ dataroomId })}`);
}
