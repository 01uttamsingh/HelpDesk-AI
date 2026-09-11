import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketReply,
  ReplySenderType,
} from "@prisma/client";

export interface InboundEmailPayload {
  from: string;
  to?: string | null;
  subject?: string | null;
  text?: string | null;
  body?: string | null;
  html?: string | null;
  messageId?: string | null;
  category?: TicketCategory | null;
}

export interface ParsedEmailAddress {
  name: string;
  email: string;
}

export interface CreateTicketInput {
  subject: string;
  body: string;
  htmlBody?: string | null;
  senderName: string;
  senderEmail: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory | null;
  messageId?: string | null;
}

export type TicketSortField =
  | "createdAt"
  | "priority"
  | "status"
  | "category"
  | "subject"
  | "senderName"
  | "senderEmail"
  | "id";

export type TicketSortOrder = "asc" | "desc";

export interface TicketCounts {
  total: number;
  open: number;
  resolved: number;
  closed: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedTicketsResult {
  tickets: Ticket[];
  pagination: PaginationMeta;
}

export interface TicketFilterQuery {
  status?: TicketStatus;
  category?: TicketCategory | null;
  priority?: TicketPriority;
  search?: string;
  sort?: "newest" | "oldest";
  sortBy?: TicketSortField;
  sortOrder?: TicketSortOrder;
  page?: number;
  pageSize?: number;
}

export interface TicketReplyAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TicketReplyItem extends TicketReply {
  user?: TicketReplyAuthor | null;
}

export interface TicketWithDetails extends Ticket {
  assignedTo?: TicketReplyAuthor | null;
  replies?: TicketReplyItem[];
}

export type { Ticket, TicketStatus, TicketPriority, TicketCategory, TicketReply, ReplySenderType };


