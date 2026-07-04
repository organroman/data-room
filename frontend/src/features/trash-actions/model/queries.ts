import { useQuery } from "@tanstack/react-query";
import * as api from "../api/trashApi";
import { queryKeys } from "@/shared/api/queryKeys";

export function useTrash(dataroomId?: string) {
  return useQuery({
    queryKey: [...queryKeys.trash, dataroomId ?? "all"],
    queryFn: () => api.listTrash(dataroomId),
  });
}
