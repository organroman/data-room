import { api, toQueryString } from "@/shared/api/client";
import type { Dataroom, DataroomSummary, FolderContents } from "@shared/types";

export function listDatarooms() {
  return api.get<DataroomSummary[]>("/datarooms");
}

export function createDataroom(name: string) {
  return api.post<Dataroom>("/datarooms", { name });
}

export function renameDataroom(dataroomId: string, name: string) {
  return api.patch<Dataroom>(`/datarooms/${dataroomId}`, { name });
}

export function deleteDataroom(dataroomId: string) {
  return api.delete<void>(`/datarooms/${dataroomId}`);
}

export function restoreDataroom(dataroomId: string) {
  return api.post<void>(`/datarooms/${dataroomId}/restore`);
}

export function getDataroomContents(dataroomId: string, folderId?: string, search?: string) {
  const qs = toQueryString({ folderId, search });
  return api.get<FolderContents>(`/datarooms/${dataroomId}/contents${qs}`);
}
