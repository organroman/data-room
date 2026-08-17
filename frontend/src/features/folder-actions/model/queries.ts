import { useQuery } from "@tanstack/react-query";
import * as api from "../api/folderApi";

/** Powers the delete-warning dialog — only fetched while that dialog is open. */
export function useSubtreeStats(folderId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["datarooms", "folders", folderId, "subtree-stats"],
    queryFn: () => api.getSubtreeStats(folderId),
    enabled,
  });
}
