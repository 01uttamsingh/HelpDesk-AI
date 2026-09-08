import { api } from "@/lib/api";
import type {
  TicketItem,
  TicketFilters,
  TicketCounts,
  PaginationMeta,
  TicketAssignedUser,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  TicketReplyItem,
} from "../types";

export interface GetTicketsResponse {
  success: boolean;
  data: TicketItem[];
  pagination?: PaginationMeta;
  counts?: TicketCounts;
}

export interface GetTicketsResult {
  tickets: TicketItem[];
  pagination?: PaginationMeta;
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

  if (filters?.page) {
    params.page = String(filters.page);
  }

  if (filters?.pageSize) {
    params.pageSize = String(filters.pageSize);
  }

  const res = await api.get<GetTicketsResponse>("/api/tickets", { params });
  return {
    tickets: res.data.data,
    pagination: res.data.pagination,
    counts: res.data.counts,
  };
}

export async function getTicketById(id: number): Promise<TicketItem> {
  const res = await api.get<GetTicketResponse>(`/api/tickets/${id}`);
  return res.data.data;
}

export interface AssignTicketResponse {
  success: boolean;
  data: TicketItem;
}

export interface GetAssigneesResponse {
  success: boolean;
  data: TicketAssignedUser[];
}

export async function assignTicket(
  id: number,
  assignedToId: string | null
): Promise<TicketItem> {
  const res = await api.patch<AssignTicketResponse>(`/api/tickets/${id}/assign`, {
    assignedToId,
  });
  return res.data.data;
}

export async function getAssignableUsers(): Promise<TicketAssignedUser[]> {
  try {
    const res = await api.get<GetAssigneesResponse>("/api/tickets/assignees");
    return Array.isArray(res?.data?.data) ? res.data.data : [];
  } catch {
    return [];
  }
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  category?: TicketCategory | null;
  priority?: TicketPriority;
  assignedToId?: string | null;
}

export interface UpdateTicketResponse {
  success: boolean;
  data: TicketItem;
}

export async function updateTicket(
  id: number,
  data: UpdateTicketInput
): Promise<TicketItem> {
  const res = await api.patch<UpdateTicketResponse>(`/api/tickets/${id}`, data);
  return res.data.data;
}

export interface CreateReplyResponse {
  success: boolean;
  data: TicketReplyItem;
}

export interface GetRepliesResponse {
  success: boolean;
  data: TicketReplyItem[];
}

export async function createTicketReply(
  ticketId: number,
  body: string,
  status?: TicketStatus
): Promise<TicketReplyItem> {
  const res = await api.post<CreateReplyResponse>(`/api/tickets/${ticketId}/replies`, {
    body,
    status,
  });
  return res.data.data;
}

export async function getTicketReplies(ticketId: number): Promise<TicketReplyItem[]> {
  const res = await api.get<GetRepliesResponse>(`/api/tickets/${ticketId}/replies`);
  return res.data.data;
}

export interface PolishReplyResponse {
  success: boolean;
  data: {
    polishedText: string;
  };
}

export async function polishTicketReply(
  text: string,
  ticketId?: number
): Promise<{ polishedText: string }> {
  const endpoint = ticketId
    ? `/api/tickets/${ticketId}/polish-reply`
    : `/api/tickets/polish-reply`;
  const res = await api.post<PolishReplyResponse>(endpoint, { text });
  return res.data.data;
}

export interface SummarizeTicketResponse {
  success: boolean;
  data: {
    summary: string;
  };
}

export async function summarizeTicket(ticketId: number): Promise<{ summary: string }> {
  const res = await api.post<SummarizeTicketResponse>(`/api/tickets/${ticketId}/summarize`);
  return res.data.data;
}



