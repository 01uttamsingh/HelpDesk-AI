export type TicketStatus = "OPEN" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketCategory =
  | "GENERAL_QUESTION"
  | "TECHNICAL_QUESTION"
  | "REFUND_REQUEST";

export interface TicketAssignedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export type ReplySenderType = "AGENT" | "CUSTOMER" | "AI";

export interface TicketReplyAuthor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TicketReplyItem {
  id: number;
  ticketId: number;
  userId?: string | null;
  user?: TicketReplyAuthor | null;
  senderType: ReplySenderType;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketItem {
  id: number;
  subject: string;
  body: string;
  htmlBody?: string | null;
  senderName: string;
  senderEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: TicketCategory | null;
  messageId?: string | null;
  assignedToId?: string | null;
  assignedTo?: TicketAssignedUser | null;
  replies?: TicketReplyItem[];
  createdAt: string;
  updatedAt: string;
}

export type StatusFilter = "ALL" | TicketStatus;
export type CategoryFilter = "ALL" | TicketCategory | "UNCATEGORIZED";
export type PriorityFilter = "ALL" | TicketPriority;
export type SortFilter = "newest" | "oldest";

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

export interface TicketFilters {
  status?: StatusFilter;
  category?: CategoryFilter;
  priority?: PriorityFilter;
  search?: string;
  sort?: SortFilter;
  sortBy?: TicketSortField;
  sortOrder?: TicketSortOrder;
  page?: number;
  pageSize?: number;
}

