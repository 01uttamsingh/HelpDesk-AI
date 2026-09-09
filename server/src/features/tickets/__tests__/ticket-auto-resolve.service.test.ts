import { describe, it, expect, mock, beforeEach } from "bun:test";
import prisma from "../../../prisma";
import { TicketCategory, TicketPriority, TicketStatus, ReplySenderType } from "@prisma/client";
import { TicketServiceError, ticketService } from "../ticket.service";
import { loadKnowledgeBase } from "../ticket-auto-resolve.service";

let mockGenerateText = mock(async (_options: any) => ({
  output: {
    canAutoResolve: true,
    confidence: 0.95,
    category: "GENERAL_QUESTION",
    priority: "LOW",
    reasoning: "Question regarding forgotten password covered in Section 1 of Knowledge Base.",
    reply: "Dear John,\n\nTo reset your password, please go to the login page, click Forgot Password, enter your registered email address, and follow the instructions in the reset email.\n\nBest regards,\nHelpDesk Support Team",
  },
}));

mock.module("ai", () => ({
  generateText: (options: any) => mockGenerateText(options),
  Output: {
    object: (opts: any) => opts,
  },
}));

// Import services and controller after mock.module
const { ticketAutoResolveService, HELPDESK_SUPPORT_TEAM } = await import("../ticket-auto-resolve.service");
const { ticketController } = await import("../ticket.controller");
const { ticketIngestService } = await import("../ticket-ingest.service");

function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.status = mock((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = mock((data: any) => {
    res.body = data;
    return res;
  });
  return res;
}

describe("ticketAutoResolveService", () => {
  beforeEach(() => {
    mockGenerateText = mock(async (_options: any) => ({
      output: {
        canAutoResolve: true,
        confidence: 0.95,
        category: "GENERAL_QUESTION",
        priority: "LOW",
        reasoning: "Question regarding forgotten password covered in Section 1 of Knowledge Base.",
        reply: "To reset your password, please go to the login page, click Forgot Password, enter your registered email, and follow the reset instructions.",
      },
    }));
  });

  describe("loadKnowledgeBase", () => {
    it("loads and returns the official knowledge-base.md content with all sections", () => {
      const kb = loadKnowledgeBase();
      expect(kb).toBeDefined();
      expect(typeof kb).toBe("string");
      expect(kb).toContain("Code with Mosh -- Support Knowledge Base");
      expect(kb).toContain("1. Account & Login Issues");
      expect(kb).toContain("4. Refund Policy");
      expect(kb).toContain("10. Escalation Rules (Internal Policy)");
    });
  });

  describe("autoResolveTicket - State Transitions & Auto-Resolution", () => {
    it("moves ticket from NEW to PROCESSING, and then to RESOLVED with an AI reply addressing customer by first name and signing with HelpDesk Support Team", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Forgot my password",
          body: "Hello, I forgot my password and cannot log into my account.",
          senderName: "Alice Walker",
          senderEmail: `alice.${Date.now()}@example.com`,
          status: TicketStatus.NEW,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      expect(ticket.status).toBe(TicketStatus.NEW);

      let capturedPrompt: any = null;
      mockGenerateText = mock(async (options: any) => {
        capturedPrompt = options;
        return {
          output: {
            canAutoResolve: true,
            confidence: 0.98,
            category: "GENERAL_QUESTION",
            priority: "LOW",
            reasoning: "Password reset steps detailed in Section 1 of Knowledge Base.",
            reply: "To reset your password, go to the login page and click Forgot Password.",
          },
        };
      });

      const result = await ticketAutoResolveService.autoResolveTicket(ticket.id);

      expect(result.resolved).toBe(true);
      expect(result.ticket.status).toBe(TicketStatus.RESOLVED);
      expect(result.ticket.category).toBe(TicketCategory.GENERAL_QUESTION);
      expect(result.ticket.priority).toBe(TicketPriority.LOW);

      // Verify AI reply created in database
      const dbReplies = await prisma.ticketReply.findMany({
        where: { ticketId: ticket.id },
      });
      expect(dbReplies.length).toBe(1);
      expect(dbReplies[0].senderType).toBe(ReplySenderType.AI);
      expect(dbReplies[0].userId).toBeNull();
      // Addressed by customer first name
      expect(dbReplies[0].body).toContain("Dear Alice,");
      expect(dbReplies[0].body).toContain("Forgot Password");
      // Signed with HelpDesk Support Team
      expect(dbReplies[0].body).toContain("HelpDesk Support Team");

      // Verify prompt included knowledge base content and customer message
      expect(capturedPrompt.system).toContain("OFFICIAL KNOWLEDGE BASE");
      expect(capturedPrompt.system).toContain("HelpDesk Support Team");
      expect(capturedPrompt.prompt).toContain("Alice Walker");
      expect(capturedPrompt.prompt).toContain("Customer First Name: Alice");
      expect(capturedPrompt.prompt).toContain("Forgot my password");
    });

    it("addresses customer by derived first name from email and signs with HelpDesk Support Team when senderName is empty", async () => {
      const email = `robert.smith.${Date.now()}@example.com`;
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Course invoice request",
          body: "Where can I download my course receipt?",
          senderName: "",
          senderEmail: email,
          status: TicketStatus.NEW,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      let capturedPrompt: any = null;
      mockGenerateText = mock(async (options: any) => {
        capturedPrompt = options;
        return {
          output: {
            canAutoResolve: true,
            confidence: 0.95,
            category: "GENERAL_QUESTION",
            priority: "LOW",
            reasoning: "Receipt guidance from Knowledge Base Section 2.",
            reply: "To download your receipt, check your original purchase confirmation email or visit your account billing section.",
          },
        };
      });

      const result = await ticketAutoResolveService.autoResolveTicket(ticket.id);

      expect(result.resolved).toBe(true);
      expect(result.ticket.status).toBe(TicketStatus.RESOLVED);

      const dbReplies = await prisma.ticketReply.findMany({
        where: { ticketId: ticket.id },
      });
      expect(dbReplies.length).toBe(1);
      // Derived Robert from robert.smith...
      expect(dbReplies[0].body).toContain("Dear Robert,");
      expect(dbReplies[0].body).toContain("HelpDesk Support Team");
      expect(capturedPrompt.prompt).toContain("Customer First Name: Robert");
    });

    it("ensures the reply is properly formatted with clean paragraphs, no raw markdown headers, and signed off with HelpDesk Support Team", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Playback issues with video 4",
          body: "Video won't play",
          senderName: "Diana Prince",
          senderEmail: `diana.${Date.now()}@example.com`,
          status: TicketStatus.NEW,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      mockGenerateText = mock(async () => ({
        output: {
          canAutoResolve: true,
          confidence: 0.96,
          category: "TECHNICAL_QUESTION",
          priority: "MEDIUM",
          reasoning: "Video troubleshooting steps in Section 6.",
          reply: `### Troubleshooting Steps\n\n1. Clear browser cache.\n2. Try Incognito mode.\n\n\n\nBest regards,\nCode with Mosh Support Team`,
        },
      }));

      const result = await ticketAutoResolveService.autoResolveTicket(ticket.id);
      expect(result.resolved).toBe(true);

      const dbReplies = await prisma.ticketReply.findMany({
        where: { ticketId: ticket.id },
      });
      const body = dbReplies[0].body;

      // Greeting
      expect(body).toContain("Dear Diana,");
      // Markdown heading stripped
      expect(body).not.toContain("###");
      expect(body).toContain("Troubleshooting Steps");
      // Triple newlines collapsed
      expect(body).not.toContain("\n\n\n");
      // Old team name replaced with HelpDesk Support Team
      expect(body).not.toContain("Code with Mosh Support Team");
      expect(body).toContain("HelpDesk Support Team");
    });

    it("moves ticket from NEW to PROCESSING, and then to OPEN (escalated) when AI cannot resolve", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "I demand a refund outside 30 days and will sue you",
          body: "I bought this course 6 months ago, I demand my money back or I will take legal action!",
          senderName: "Angry Bob",
          senderEmail: `bob.${Date.now()}@example.com`,
          status: TicketStatus.NEW,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      mockGenerateText = mock(async () => ({
        output: {
          canAutoResolve: false,
          confidence: 0.99,
          category: "REFUND_REQUEST",
          priority: "HIGH",
          reasoning: "Section 10 Escalation: Legal action threat and refund request outside 30 days window.",
          reply: "",
        },
      }));

      const result = await ticketAutoResolveService.autoResolveTicket(ticket.id);

      expect(result.resolved).toBe(false);
      expect(result.ticket.status).toBe(TicketStatus.OPEN);
      expect(result.ticket.category).toBe(TicketCategory.REFUND_REQUEST);
      expect(result.ticket.priority).toBe(TicketPriority.HIGH);

      // Verify no AI reply was created
      const dbReplies = await prisma.ticketReply.findMany({
        where: { ticketId: ticket.id },
      });
      expect(dbReplies.length).toBe(0);
    });

    it("moves ticket to OPEN when question is not covered in knowledge base (low confidence)", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Django ORM raw SQL query question",
          body: "How do I do a LEFT JOIN using raw SQL with parameters in Django 5?",
          senderName: "Dev Dave",
          senderEmail: `dave.${Date.now()}@example.com`,
          status: TicketStatus.NEW,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      mockGenerateText = mock(async () => ({
        output: {
          canAutoResolve: false,
          confidence: 0.3,
          category: "TECHNICAL_QUESTION",
          priority: "MEDIUM",
          reasoning: "Custom coding question not addressed in the general support knowledge base.",
          reply: "",
        },
      }));

      const result = await ticketAutoResolveService.autoResolveTicket(ticket.id);

      expect(result.resolved).toBe(false);
      expect(result.ticket.status).toBe(TicketStatus.OPEN);
      expect(result.ticket.category).toBe(TicketCategory.TECHNICAL_QUESTION);

      // Verify no AI reply created
      const dbReplies = await prisma.ticketReply.findMany({
        where: { ticketId: ticket.id },
      });
      expect(dbReplies.length).toBe(0);
    });

    it("skips auto-resolution if ticket is already RESOLVED or CLOSED", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Already resolved ticket",
          body: "I had a question but it's resolved.",
          senderName: "Charlie Brown",
          senderEmail: `charlie.${Date.now()}@example.com`,
          status: TicketStatus.RESOLVED,
          priority: TicketPriority.LOW,
          category: TicketCategory.GENERAL_QUESTION,
        },
      });

      let called = false;
      mockGenerateText = mock(async () => {
        called = true;
        return { output: {} as any };
      });

      const result = await ticketAutoResolveService.autoResolveTicket(ticket.id);
      expect(called).toBe(false);
      expect(result.ticket.status).toBe(TicketStatus.RESOLVED);
      expect(result.reasoning).toContain("already resolved");
    });

    it("throws 404 TicketServiceError when ticket does not exist", async () => {
      expect(ticketAutoResolveService.autoResolveTicket(999999999)).rejects.toThrow(
        TicketServiceError
      );
    });

    it("recovers to OPEN status when AI generation throws an error", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Temporary AI error ticket",
          body: "My video is not playing",
          senderName: "Eve Smith",
          senderEmail: `eve.${Date.now()}@example.com`,
          status: TicketStatus.NEW,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      mockGenerateText = mock(async () => {
        throw new Error("Rate limit exceeded");
      });

      try {
        await ticketAutoResolveService.autoResolveTicket(ticket.id);
        expect(true).toBe(false); // should not reach
      } catch (err: any) {
        expect(err).toBeInstanceOf(TicketServiceError);
        expect(err.statusCode).toBe(502);
      }

      // Verify ticket status was restored to OPEN instead of stuck in PROCESSING
      const dbTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(dbTicket?.status).toBe(TicketStatus.OPEN);
    });
  });

  describe("Inbound Email Ingestion - Status Flow", () => {
    it("sets status to NEW when creating a new inbound ticket", async () => {
      const timestamp = Date.now();
      const result = await ticketIngestService.ingestInboundEmail({
        from: `Student Sam <sam.${timestamp}@example.com>`,
        subject: `New Inquiry [${timestamp}]`,
        text: "I need help with my course access.",
      });

      expect(result.status).toBe(TicketStatus.NEW);
      expect(result.isReply).toBe(false);
    });

    it("sets status to OPEN when a customer sends a follow-up reply to an existing ticket", async () => {
      const timestamp = Date.now();
      const email = `customer.${timestamp}@example.com`;
      const subject = `Course Question [${timestamp}]`;

      // 1. Initial ticket created and resolved
      const initialTicket = await ticketIngestService.ingestInboundEmail({
        from: `Customer <${email}>`,
        subject,
        text: "Initial question",
      });

      // Move to RESOLVED
      await prisma.ticket.update({
        where: { id: initialTicket.id },
        data: { status: TicketStatus.RESOLVED },
      });

      // 2. Customer replies back
      const replyResult = await ticketIngestService.ingestInboundEmail({
        from: `Customer <${email}>`,
        subject: `Re: ${subject}`,
        text: "Actually that did not work.",
      });

      expect(replyResult.isReply).toBe(true);
      expect(replyResult.status).toBe(TicketStatus.OPEN);

      const dbTicket = await prisma.ticket.findUnique({ where: { id: initialTicket.id } });
      expect(dbTicket?.status).toBe(TicketStatus.OPEN);
    });
  });

  describe("Ticket Lists & Counts - Exclusion of NEW and PROCESSING", () => {
    it("does not show tickets with status NEW or PROCESSING on the ticket lists", async () => {
      const uniqueTag = `exclusion_test_${Date.now()}`;

      // Create 1 NEW, 1 PROCESSING, 1 OPEN, 1 RESOLVED
      const newTicket = await prisma.ticket.create({
        data: {
          subject: `${uniqueTag} - NEW Ticket`,
          body: "Being processed",
          senderName: "User 1",
          senderEmail: "u1@example.com",
          status: TicketStatus.NEW,
          priority: TicketPriority.LOW,
        },
      });

      const procTicket = await prisma.ticket.create({
        data: {
          subject: `${uniqueTag} - PROCESSING Ticket`,
          body: "Currently with AI",
          senderName: "User 2",
          senderEmail: "u2@example.com",
          status: TicketStatus.PROCESSING,
          priority: TicketPriority.LOW,
        },
      });

      const openTicket = await prisma.ticket.create({
        data: {
          subject: `${uniqueTag} - OPEN Ticket`,
          body: "For human agents",
          senderName: "User 3",
          senderEmail: "u3@example.com",
          status: TicketStatus.OPEN,
          priority: TicketPriority.LOW,
        },
      });

      const resolvedTicket = await prisma.ticket.create({
        data: {
          subject: `${uniqueTag} - RESOLVED Ticket`,
          body: "Resolved by AI",
          senderName: "User 4",
          senderEmail: "u4@example.com",
          status: TicketStatus.RESOLVED,
          priority: TicketPriority.LOW,
        },
      });

      // Query ticket list with search matching the unique tag
      const { tickets } = await ticketService.getAllTickets({ search: uniqueTag });

      const ticketIds = tickets.map((t) => t.id);

      // Neither NEW nor PROCESSING should be on the ticket lists!
      expect(ticketIds).not.toContain(newTicket.id);
      expect(ticketIds).not.toContain(procTicket.id);

      // OPEN and RESOLVED should be visible
      expect(ticketIds).toContain(openTicket.id);
      expect(ticketIds).toContain(resolvedTicket.id);
    });

    it("getTicketCounts excludes NEW and PROCESSING tickets from total count", async () => {
      const counts = await ticketService.getTicketCounts();

      // Sum of open + resolved + closed must exactly equal total count
      expect(counts.total).toBe(counts.open + counts.resolved + counts.closed);
    });
  });

  describe("POST /api/tickets/:id/auto-resolve controller endpoint", () => {
    it("returns 200 with auto-resolve result when ticket exists", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Videos not playing in Chrome",
          body: "Videos are not playing in my browser. What should I try?",
          senderName: "Frank Miller",
          senderEmail: `frank.${Date.now()}@example.com`,
          status: TicketStatus.NEW,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      mockGenerateText = mock(async () => ({
        output: {
          canAutoResolve: true,
          confidence: 0.95,
          category: "TECHNICAL_QUESTION",
          priority: "MEDIUM",
          reasoning: "Video troubleshooting covered in Section 7 of Knowledge Base.",
          reply: "Please clear your browser cache, use latest Chrome or Edge, and disable extensions.",
        },
      }));

      const req: any = { params: { id: String(ticket.id) } };
      const res = createMockRes();

      await ticketController.autoResolveTicket(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resolved).toBe(true);
      expect(res.body.data.ticket.status).toBe(TicketStatus.RESOLVED);
    });

    it("returns 400 when invalid ticket ID is provided", async () => {
      const req: any = { params: { id: "not-a-number" } };
      const res = createMockRes();

      await ticketController.autoResolveTicket(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("positive integer");
    });

    it("returns 404 when ticket is not found", async () => {
      const req: any = { params: { id: "88888888" } };
      const res = createMockRes();

      await ticketController.autoResolveTicket(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Ticket not found");
    });
  });
});
