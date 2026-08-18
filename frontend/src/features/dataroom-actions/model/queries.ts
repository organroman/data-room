import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as api from "../api/dataroomApi";
import { queryKeys } from "@/shared/api/queryKeys";

export function useDatarooms() {
  return useQuery({ queryKey: queryKeys.datarooms, queryFn: api.listDatarooms });
}

export function useDataroomContents(
  dataroomId: string,
  folderId?: string,
  search?: string,
  token?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dataroomContents(dataroomId, folderId, search, token),
    queryFn: () => api.getDataroomContents(dataroomId, folderId, search, token),
    enabled: Boolean(dataroomId) && enabled,
    // Search re-keys the query on every keystroke; without this, data briefly
    // goes undefined between keystrokes (unmounting Breadcrumbs, flashing the
    // loading skeleton) instead of smoothly updating in place.
    placeholderData: keepPreviousData,
  });
}
