import { describe, it, expect } from "bun:test";
import { ticketIngestService } from "../ticket-ingest.service";
import prisma from "../../../prisma";
import { TicketCategory } from "@prisma/client";

describe("ticketIngestService", () => {
  it("ingests inbound email with display name and creates a Ticket with integer ID and null category", async () => {
    const payload = {
      from: "Alice Student <alice.student@example.com>",
      subject: "Cannot access course module 3",
      text: "Hello support, the video player is showing a black screen.",
      html: "<p>Hello support, the video player is showing a black screen.</p>",
      messageId: "<test-msg-001@example.com>",
    };

    const ticket = await ticketIngestService.ingestInboundEmail(payload);

    expect(typeof ticket.id).toBe("number");
    expect(ticket.id).toBeGreaterThan(0);
    expect(ticket.senderName).toBe("Alice Student");
    expect(ticket.senderEmail).toBe("alice.student@example.com");
    expect(ticket.subject).toBe("Cannot access course module 3");
    expect(ticket.body).toBe("Hello support, the video player is showing a black screen.");
    expect(ticket.htmlBody).toBe("<p>Hello support, the video player is showing a black screen.</p>");
    expect(ticket.messageId).toBe("<test-msg-001@example.com>");
    expect(ticket.status).toBe("OPEN");
    expect(ticket.priority).toBe("MEDIUM");
    expect(ticket.category).toBeNull();

    // Verify stored directly in PostgreSQL
    const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(stored).not.toBeNull();
    expect(stored?.id).toBe(ticket.id);
    expect(stored?.senderName).toBe("Alice Student");
    expect(stored?.category).toBeNull();
  });

  it("derives non-empty senderName when only email address is provided in from header", async () => {
    const payload = {
      from: "developer.bob@example.com",
      subject: "API Integration question",
      text: "How do I query the tickets endpoint?",
    };

    const ticket = await ticketIngestService.ingestInboundEmail(payload);

    expect(typeof ticket.id).toBe("number");
    expect(ticket.senderName).toBe("Developer Bob");
    expect(ticket.senderEmail).toBe("developer.bob@example.com");
    expect(ticket.category).toBeNull();
  });

  it("defaults to '(No Subject)' when subject is omitted or empty", async () => {
    const payload = {
      from: "charlie@example.com",
      subject: "",
      text: "Just checking in without subject",
    };

    const ticket = await ticketIngestService.ingestInboundEmail(payload);

    expect(ticket.subject).toBe("(No Subject)");
  });

  it("auto-increments integer id sequentially across multiple created tickets", async () => {
    const ticket1 = await ticketIngestService.ingestInboundEmail({
      from: "user1@example.com",
      subject: "First Ticket",
      text: "First body",
    });

    const ticket2 = await ticketIngestService.ingestInboundEmail({
      from: "user2@example.com",
      subject: "Second Ticket",
      text: "Second body",
    });

    expect(typeof ticket1.id).toBe("number");
    expect(typeof ticket2.id).toBe("number");
    expect(ticket2.id).toBeGreaterThan(ticket1.id);
  });

  it("persists TicketCategory enum values correctly when provided", async () => {
    const categories: TicketCategory[] = [
      TicketCategory.GENERAL_QUESTION,
      TicketCategory.TECHNICAL_QUESTION,
      TicketCategory.REFUND_REQUEST,
    ];

    for (const cat of categories) {
      const ticket = await ticketIngestService.ingestInboundEmail({
        from: `student-${cat.toLowerCase()}@example.com`,
        subject: `Ticket for ${cat}`,
        text: `Inquiry regarding category ${cat}`,
        category: cat,
      });

      expect(ticket.category).toBe(cat);

      const stored = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(stored?.category).toBe(cat);
    }
  });
});
