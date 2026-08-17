import { api } from "@/shared/api/client";
import type { ActivityEntry } from "@shared/types";

export function getDataroomActivity(dataroomId: string) {
  return api.get<ActivityEntry[]>(`/datarooms/${dataroomId}/activity`);
}
