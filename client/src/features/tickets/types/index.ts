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
  createdAt: string;
  updatedAt: string;
}

export type StatusFilter = "ALL" | TicketStatus;
export type CategoryFilter = "ALL" | TicketCategory | "UNCATEGORIZED";
export type SortFilter = "newest" | "oldest";

export interface TicketFilters {
  status?: StatusFilter;
  category?: CategoryFilter;
  search?: string;
  sort?: SortFilter;
}
