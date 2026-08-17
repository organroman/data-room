import { useQuery } from "@tanstack/react-query";
import * as api from "../api/activityApi";
import { queryKeys } from "@/shared/api/queryKeys";

/** Only fetched while the ActivityPanel is open. */
export function useDataroomActivity(dataroomId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.activity(dataroomId),
    queryFn: () => api.getDataroomActivity(dataroomId),
    enabled,
  });
}
