import { useQuery } from "@tanstack/react-query";
import * as api from "../api/starredApi";
import { queryKeys } from "@/shared/api/queryKeys";

export function useStarred() {
  return useQuery({ queryKey: queryKeys.starred, queryFn: api.listStarred });
}
