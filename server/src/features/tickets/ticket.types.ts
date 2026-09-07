import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from "@prisma/client";

export interface InboundEmailPayload {
  from: string;
  to?: string;
  subject?: string;
  text?: string;
  body?: string;
  html?: string;
  messageId?: string;
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

export interface TicketFilterQuery {
  status?: TicketStatus;
  category?: TicketCategory;
  search?: string;
  sort?: "newest" | "oldest";
}

export type { Ticket, TicketStatus, TicketPriority, TicketCategory };
