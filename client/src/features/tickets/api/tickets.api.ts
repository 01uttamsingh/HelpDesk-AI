import { api } from "@/lib/api";
import type { TicketItem, TicketFilters, TicketCounts } from "../types";

export interface GetTicketsResponse {
  success: boolean;
  data: TicketItem[];
  counts?: TicketCounts;
}

export interface GetTicketsResult {
  tickets: TicketItem[];
  counts?: TicketCounts;
}

export interface GetTicketResponse {
  success: boolean;
  data: TicketItem;
}

export async function getTickets(filters?: TicketFilters): Promise<GetTicketsResult> {
  const params: Record<string, string> = {};

  if (filters?.status && filters.status !== "ALL") {
    params.status = filters.status;
  }

  if (filters?.category && filters.category !== "ALL") {
    params.category = filters.category;
  }

  if (filters?.priority && filters.priority !== "ALL") {
    params.priority = filters.priority;
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
  return {
    tickets: res.data.data,
    counts: res.data.counts,
  };
}

export async function getTicketById(id: number): Promise<TicketItem> {
  const res = await api.get<GetTicketResponse>(`/api/tickets/${id}`);
  return res.data.data;
}
