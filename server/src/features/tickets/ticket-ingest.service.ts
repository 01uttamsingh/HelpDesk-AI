import prisma from "../../prisma";
import { TicketStatus, TicketPriority, type Ticket } from "@prisma/client";
import type { InboundEmailPayload } from "./ticket.types";
import { parseEmailAddress, cleanSubject } from "./ticket.utils";

export class TicketIngestService {
  /**
   * Ingests an inbound support email and persists it as a new Ticket.
   * - Sets id as auto-increment integer in PostgreSQL.
   * - Ensures required senderName is non-null.
   * - Leaves category as null when omitted (optional, with no default value, TicketCategory enum).
   */
  async ingestInboundEmail(payload: InboundEmailPayload): Promise<Ticket> {
    const { name: senderName, email: senderEmail } = parseEmailAddress(payload.from);
    const body = (payload.text || payload.body || "").trim();
    const subject = cleanSubject(payload.subject);

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        body,
        htmlBody: payload.html?.trim() || null,
        senderName,
        senderEmail,
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        category: payload.category ?? null,
        messageId: payload.messageId?.trim() || null,
      },
    });

    return ticket;
  }
}

export const ticketIngestService = new TicketIngestService();
