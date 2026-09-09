import prisma from "../../prisma";
import {
  TicketStatus,
  TicketPriority,
  ReplySenderType,
  type Ticket,
  type TicketReply,
} from "@prisma/client";
import type { InboundEmailPayload } from "./ticket.types";
import { parseEmailAddress, cleanSubject, normalizeSubject } from "./ticket.utils";
import { getOrCreateAiAgent } from "./ai-agent.utils";

export interface IngestInboundEmailResult extends Ticket {
  reply?: TicketReply;
  isReply: boolean;
}

export class TicketIngestService {
  /**
   * Ingests an inbound support email.
   * - If an existing ticket from the same sender with the same subject exists,
   *   appends the incoming message as a customer reply (senderType: CUSTOMER)
   *   and sets the ticket status to OPEN with a fresh updatedAt timestamp.
   * - Otherwise, persists it as a new Ticket.
   */
  async ingestInboundEmail(payload: InboundEmailPayload): Promise<IngestInboundEmailResult> {
    const { name: senderName, email: senderEmail } = parseEmailAddress(payload.from);
    const body = (payload.text || payload.body || "").trim();
    const subject = cleanSubject(payload.subject);
    const normSubject = normalizeSubject(subject);

    // Look for existing tickets from the same sender (case-insensitive)
    const existingTickets = await prisma.ticket.findMany({
      where: {
        senderEmail: { equals: senderEmail, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const matchingTicket = existingTickets.find((t) => {
      // Direct case-insensitive match
      if (t.subject.trim().toLowerCase() === subject.toLowerCase()) return true;
      // Match normalized subject without "Re:" / "Fwd:" prefixes
      if (normSubject.length > 0 && normalizeSubject(t.subject) === normSubject) return true;
      return false;
    });

    if (matchingTicket) {
      const aiAgent = await getOrCreateAiAgent();
      const newAssignedToId = matchingTicket.assignedToId === aiAgent.id ? null : matchingTicket.assignedToId;

      // Append customer reply and ensure ticket is OPEN with updated timestamp
      const [reply, updatedTicket] = await prisma.$transaction([
        prisma.ticketReply.create({
          data: {
            ticketId: matchingTicket.id,
            userId: null,
            senderType: ReplySenderType.CUSTOMER,
            body,
            htmlBody: payload.html?.trim() || null,
          },
        }),
        prisma.ticket.update({
          where: { id: matchingTicket.id },
          data: {
            status: TicketStatus.OPEN,
            assignedToId: newAssignedToId,
            updatedAt: new Date(),
          },
        }),
      ]);

      return {
        ...updatedTicket,
        reply,
        isReply: true,
      };
    }

    // Otherwise, create a new ticket (starts as NEW, assigned to AI agent)
    const aiAgent = await getOrCreateAiAgent();
    const ticket = await prisma.ticket.create({
      data: {
        subject,
        body,
        htmlBody: payload.html?.trim() || null,
        senderName,
        senderEmail,
        status: TicketStatus.NEW,
        priority: TicketPriority.MEDIUM,
        category: payload.category ?? null,
        messageId: payload.messageId?.trim() || null,
        assignedToId: aiAgent.id,
      },
    });

    return {
      ...ticket,
      isReply: false,
    };
  }
}

export const ticketIngestService = new TicketIngestService();

