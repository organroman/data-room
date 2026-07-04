import { useQuery } from "@tanstack/react-query";
import * as api from "../api/fileApi";

export function useFile(fileId: string) {
  return useQuery({
    queryKey: ["datarooms", "files", fileId],
    queryFn: () => api.getFile(fileId),
    enabled: Boolean(fileId),
  });
}
