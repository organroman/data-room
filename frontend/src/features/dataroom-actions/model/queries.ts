import { useQuery } from "@tanstack/react-query";
import * as api from "../api/dataroomApi";
import { queryKeys } from "@/shared/api/queryKeys";

export function useDatarooms() {
  return useQuery({ queryKey: queryKeys.datarooms, queryFn: api.listDatarooms });
}

export function useDataroomContents(dataroomId: string, folderId?: string, search?: string) {
  return useQuery({
    queryKey: queryKeys.dataroomContents(dataroomId, folderId, search),
    queryFn: () => api.getDataroomContents(dataroomId, folderId, search),
    enabled: Boolean(dataroomId),
  });
}
