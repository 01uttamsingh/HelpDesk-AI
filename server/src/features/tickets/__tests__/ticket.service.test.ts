import { describe, it, expect, beforeEach } from "bun:test";
import { ticketService } from "../ticket.service";
import { ticketIngestService } from "../ticket-ingest.service";
import { TicketCategory, TicketStatus } from "@prisma/client";

describe("ticketService.getAllTickets", () => {
  it("sorts tickets by newest first by default", async () => {
    const timestamp = Date.now();
    const t1 = await ticketIngestService.ingestInboundEmail({
      from: `user1.${timestamp}@example.com`,
      subject: `Old Ticket ${timestamp}`,
      text: "Oldest body",
    });

    // Small delay to guarantee different createdAt
    await new Promise((res) => setTimeout(res, 20));

    const t2 = await ticketIngestService.ingestInboundEmail({
      from: `user2.${timestamp}@example.com`,
      subject: `New Ticket ${timestamp}`,
      text: "Newest body",
    });

    const tickets = await ticketService.getAllTickets();
    expect(tickets.length).toBeGreaterThanOrEqual(2);

    const index1 = tickets.findIndex((t) => t.id === t1.id);
    const index2 = tickets.findIndex((t) => t.id === t2.id);

    expect(index2).toBeLessThan(index1); // Newest ticket appears before older ticket
  });

  it("filters tickets by category", async () => {
    const timestamp = Date.now();
    await ticketIngestService.ingestInboundEmail({
      from: `tech.${timestamp}@example.com`,
      subject: `Technical issue ${timestamp}`,
      text: "App crashes",
      category: TicketCategory.TECHNICAL_QUESTION,
    });

    await ticketIngestService.ingestInboundEmail({
      from: `refund.${timestamp}@example.com`,
      subject: `Refund please ${timestamp}`,
      text: "Want my money back",
      category: TicketCategory.REFUND_REQUEST,
    });

    const techTickets = await ticketService.getAllTickets({
      category: TicketCategory.TECHNICAL_QUESTION,
    });

    expect(techTickets.length).toBeGreaterThan(0);
    techTickets.forEach((t) => {
      expect(t.category).toBe(TicketCategory.TECHNICAL_QUESTION);
    });
  });

  it("filters tickets by search query across subject, sender, and body", async () => {
    const timestamp = Date.now();
    const uniqueTerm = `quantum-physics-${timestamp}`;

    await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Course on ${uniqueTerm}`,
      text: "Need more details",
    });

    const results = await ticketService.getAllTickets({
      search: uniqueTerm,
    });

    expect(results.length).toBe(1);
    expect(results[0].subject).toContain(uniqueTerm);
  });
});
