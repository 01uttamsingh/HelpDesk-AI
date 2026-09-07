import { api } from "@/lib/api";
import type { TicketItem, TicketFilters } from "../types";

export interface GetTicketsResponse {
  success: boolean;
  data: TicketItem[];
}

export interface GetTicketResponse {
  success: boolean;
  data: TicketItem;
}

export async function getTickets(filters?: TicketFilters): Promise<TicketItem[]> {
  const params: Record<string, string> = {};

  if (filters?.status && filters.status !== "ALL") {
    params.status = filters.status;
  }

  if (filters?.category && filters.category !== "ALL" && filters.category !== "UNCATEGORIZED") {
    params.category = filters.category;
  }

  if (filters?.search && filters.search.trim().length > 0) {
    params.search = filters.search.trim();
  }

  if (filters?.sortBy) {
    params.sortBy = filters.sortBy;
  }

  if (filters?.sortOrder) {
    params.sortOrder = filters.sortOrder;
  } else if (filters?.sort) {
    params.sort = filters.sort;
  }

  const res = await api.get<GetTicketsResponse>("/api/tickets", { params });
  return res.data.data;
}

export async function getTicketById(id: number): Promise<TicketItem> {
  const res = await api.get<GetTicketResponse>(`/api/tickets/${id}`);
  return res.data.data;
}
