import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "../api/dashboard.api";
import type { DashboardStatsData } from "../types";

export function useDashboardStats() {
  const query = useQuery<DashboardStatsData, Error>({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
