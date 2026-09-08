import { describe, it, expect } from "bun:test";
import { ticketIngestService } from "../ticket-ingest.service";
import prisma from "../../../prisma";
import { TicketCategory, TicketStatus, ReplySenderType } from "@prisma/client";

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

  it("appends inbound email as a CUSTOMER reply when sender and exact subject match an existing ticket", async () => {
    const timestamp = Date.now();
    const sender = `customer.${timestamp}@example.com`;
    const subject = `Postgres Connection Issue ${timestamp}`;

    // 1. Initial email creates the ticket
    const initialTicket = await ticketIngestService.ingestInboundEmail({
      from: `Alice <${sender}>`,
      subject,
      text: "I cannot connect to Postgres.",
    });

    expect(initialTicket.isReply).toBe(false);

    // 2. Follow-up email with same sender and same subject
    const followUp = await ticketIngestService.ingestInboundEmail({
      from: `Alice <${sender}>`,
      subject,
      text: "Here is my error message: ECONNREFUSED 127.0.0.1:5433",
    });

    expect(followUp.isReply).toBe(true);
    expect(followUp.id).toBe(initialTicket.id);
    expect(followUp.reply).toBeDefined();
    expect(followUp.reply?.ticketId).toBe(initialTicket.id);
    expect(followUp.reply?.senderType).toBe(ReplySenderType.CUSTOMER);
    expect(followUp.reply?.userId).toBeNull();
    expect(followUp.reply?.body).toBe("Here is my error message: ECONNREFUSED 127.0.0.1:5433");

    // Verify stored in database
    const replies = await prisma.ticketReply.findMany({
      where: { ticketId: initialTicket.id },
    });
    expect(replies.length).toBe(1);
    expect(replies[0].senderType).toBe(ReplySenderType.CUSTOMER);
    expect(replies[0].body).toBe("Here is my error message: ECONNREFUSED 127.0.0.1:5433");
  });

  it("appends inbound email as a CUSTOMER reply when subject has 'Re:' prefix", async () => {
    const timestamp = Date.now();
    const sender = `student.${timestamp}@example.com`;
    const subject = `Vite React 19 Bug ${timestamp}`;

    const initialTicket = await ticketIngestService.ingestInboundEmail({
      from: `Bob <${sender}>`,
      subject,
      text: "Build fails with React 19.",
    });

    // Customer replies from email client which prepends "Re: "
    const replyEmail = await ticketIngestService.ingestInboundEmail({
      from: `Bob <${sender}>`,
      subject: `Re: ${subject}`,
      text: "Never mind, I updated vite plugin and it works now.",
    });

    expect(replyEmail.isReply).toBe(true);
    expect(replyEmail.id).toBe(initialTicket.id);
    expect(replyEmail.reply?.senderType).toBe(ReplySenderType.CUSTOMER);
    expect(replyEmail.reply?.body).toBe("Never mind, I updated vite plugin and it works now.");
  });

  it("re-opens a RESOLVED ticket to OPEN when a customer replies via email", async () => {
    const timestamp = Date.now();
    const sender = `reopen.${timestamp}@example.com`;
    const subject = `Login trouble ${timestamp}`;

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `Carol <${sender}>`,
      subject,
      text: "Cannot login",
    });

    // Mark ticket as RESOLVED
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.RESOLVED },
    });

    // Customer replies
    const replyResult = await ticketIngestService.ingestInboundEmail({
      from: `Carol <${sender}>`,
      subject: `Re: ${subject}`,
      text: "Actually the problem came back today.",
    });

    expect(replyResult.isReply).toBe(true);
    expect(replyResult.status).toBe(TicketStatus.OPEN);

    const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(dbTicket?.status).toBe(TicketStatus.OPEN);
  });

  it("creates a separate new ticket when the same customer sends an email with a different subject", async () => {
    const timestamp = Date.now();
    const sender = `samecustomer.${timestamp}@example.com`;

    const ticket1 = await ticketIngestService.ingestInboundEmail({
      from: sender,
      subject: `First topic ${timestamp}`,
      text: "Topic 1",
    });

    const ticket2 = await ticketIngestService.ingestInboundEmail({
      from: sender,
      subject: `Second totally different topic ${timestamp}`,
      text: "Topic 2",
    });

    expect(ticket1.isReply).toBe(false);
    expect(ticket2.isReply).toBe(false);
    expect(ticket1.id).not.toBe(ticket2.id);
  });
});

