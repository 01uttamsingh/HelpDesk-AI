import { api } from "@/lib/api";
import type { DashboardStatsData } from "../types";

export interface DashboardStatsApiResponse {
  success: boolean;
  data: DashboardStatsData;
}

export async function getDashboardStats(): Promise<DashboardStatsData> {
  const response = await api.get<DashboardStatsApiResponse>("/api/dashboard/stats");
  return response.data.data;
}
