import { describe, it, expect, mock, beforeEach } from "bun:test";
import prisma from "../../../prisma";
import { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import { TicketServiceError } from "../ticket.service";

let mockGenerateText = mock(async (_options: any) => ({
  output: {
    category: "TECHNICAL_QUESTION",
    priority: "MEDIUM",
    reasoning: "The customer is asking about a coding bug in React.",
  },
}));

mock.module("ai", () => ({
  generateText: (options: any) => mockGenerateText(options),
  Output: {
    object: (opts: any) => opts,
  },
}));

// Import services and controller after mock.module
const { ticketClassificationService } = await import("../ticket-classification.service");
const { ticketController } = await import("../ticket.controller");
const { webhookRoutes, ticketRoutes } = await import("../ticket.routes");

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

describe("ticketClassificationService", () => {
  beforeEach(() => {
    mockGenerateText = mock(async (_options: any) => ({
      output: {
        category: "TECHNICAL_QUESTION",
        priority: "MEDIUM",
        reasoning: "The customer is asking about a coding bug in React.",
      },
    }));
  });

  describe("classifyTicket", () => {
    it("classifies a ticket using GPT and updates category & priority in DB", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Webpack build error in chapter 2",
          body: "I am getting ModuleNotFoundError when running bun build",
          senderName: "Dev Dave",
          senderEmail: "dave@example.com",
          status: TicketStatus.OPEN,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      let capturedOptions: any = null;
      mockGenerateText = mock(async (options: any) => {
        capturedOptions = options;
        return {
          output: {
            category: "TECHNICAL_QUESTION",
            priority: "HIGH",
            reasoning: "Build blocker in course chapter 2 preventing progression.",
          },
        };
      });

      const result = await ticketClassificationService.classifyTicket(ticket.id);

      expect(result.classification.category).toBe(TicketCategory.TECHNICAL_QUESTION);
      expect(result.classification.priority).toBe(TicketPriority.HIGH);
      expect(result.classification.reasoning).toContain("Build blocker");

      expect(capturedOptions).not.toBeNull();
      expect(capturedOptions.prompt).toContain("Webpack build error in chapter 2");
      expect(capturedOptions.prompt).toContain("ModuleNotFoundError");

      // Verify PostgreSQL DB was updated
      const updatedInDb = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(updatedInDb?.category).toBe(TicketCategory.TECHNICAL_QUESTION);
      expect(updatedInDb?.priority).toBe(TicketPriority.HIGH);

      // Clean up
      await prisma.ticket.delete({ where: { id: ticket.id } });
    });

    it("classifies refund requests accurately as REFUND_REQUEST with HIGH priority", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Charged twice for Next.js bundle",
          body: "Please issue a refund for the second transaction of $129",
          senderName: "Billing Bob",
          senderEmail: "bob@example.com",
          status: TicketStatus.OPEN,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      mockGenerateText = mock(async () => ({
        output: {
          category: "REFUND_REQUEST",
          priority: "HIGH",
          reasoning: "Duplicate payment charge requiring immediate refund.",
        },
      }));

      const result = await ticketClassificationService.classifyTicket(ticket.id);

      expect(result.classification.category).toBe(TicketCategory.REFUND_REQUEST);
      expect(result.classification.priority).toBe(TicketPriority.HIGH);

      const updated = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(updated?.category).toBe(TicketCategory.REFUND_REQUEST);
      expect(updated?.priority).toBe(TicketPriority.HIGH);

      await prisma.ticket.delete({ where: { id: ticket.id } });
    });

    it("classifies general questions as GENERAL_QUESTION with LOW priority", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "When will the Python 3.14 course be released?",
          body: "Hi team, any ETA on the new Python course? Thanks!",
          senderName: "Student Sue",
          senderEmail: "sue@example.com",
          status: TicketStatus.OPEN,
          priority: TicketPriority.MEDIUM,
          category: null,
        },
      });

      mockGenerateText = mock(async () => ({
        output: {
          category: "GENERAL_QUESTION",
          priority: "LOW",
          reasoning: "Inquiry about future course releases without urgency.",
        },
      }));

      const result = await ticketClassificationService.classifyTicket(ticket.id);

      expect(result.classification.category).toBe(TicketCategory.GENERAL_QUESTION);
      expect(result.classification.priority).toBe(TicketPriority.LOW);

      const updated = await prisma.ticket.findUnique({ where: { id: ticket.id } });
      expect(updated?.category).toBe(TicketCategory.GENERAL_QUESTION);
      expect(updated?.priority).toBe(TicketPriority.LOW);

      await prisma.ticket.delete({ where: { id: ticket.id } });
    });

    it("throws 404 TicketServiceError when ticket ID does not exist", async () => {
      expect(ticketClassificationService.classifyTicket(99999999)).rejects.toThrow(
        TicketServiceError
      );
      try {
        await ticketClassificationService.classifyTicket(99999999);
      } catch (err: any) {
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe("Ticket not found");
      }
    });

    it("maps AI SDK errors to 502 TicketServiceError", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Failing AI call test",
          body: "Test body",
          senderName: "Tester",
          senderEmail: "tester@example.com",
        },
      });

      mockGenerateText = mock(async () => {
        throw new Error("OpenAI API rate limit exceeded");
      });

      try {
        await ticketClassificationService.classifyTicket(ticket.id);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(TicketServiceError);
        expect(err.statusCode).toBe(502);
        expect(err.message).toContain("AI Classification failed");
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });
  });

  describe("classifyTicketAsync", () => {
    it("enqueues classification job to pg-boss queue and returns job ID", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Async background classification test",
          body: "Async test body",
          senderName: "Async User",
          senderEmail: "async@example.com",
          category: null,
        },
      });

      const jobId = await ticketClassificationService.classifyTicketAsync(ticket.id);

      expect(jobId).not.toBeNull();
      expect(typeof jobId).toBe("string");

      await prisma.ticket.delete({ where: { id: ticket.id } });
    });

    it("catches errors gracefully and returns null without throwing", async () => {
      const { getQueue } = await import("../../../queue");
      const boss = getQueue();
      const originalSend = boss.send;
      boss.send = mock(async () => {
        throw new Error("pg-boss send failure");
      }) as any;

      try {
        const result = await ticketClassificationService.classifyTicketAsync(99999999);
        expect(result).toBeNull();
      } finally {
        boss.send = originalSend;
      }
    });
  });

  describe("controller & routes integration", () => {
    it("POST /api/tickets/:id/classify returns 200 with classification result", async () => {
      const ticket = await prisma.ticket.create({
        data: {
          subject: "Manual classify endpoint test",
          body: "Testing manual classify route",
          senderName: "Manual Tester",
          senderEmail: "manual@example.com",
          category: null,
        },
      });

      mockGenerateText = mock(async () => ({
        output: {
          category: "GENERAL_QUESTION",
          priority: "LOW",
          reasoning: "Manual classification check.",
        },
      }));

      const req: any = { params: { id: String(ticket.id) } };
      const res = createMockRes();

      await ticketController.classifyTicket(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.classification.category).toBe(TicketCategory.GENERAL_QUESTION);

      await prisma.ticket.delete({ where: { id: ticket.id } });
    });

    it("POST /api/tickets/:id/classify returns 400 for non-integer ID", async () => {
      const req: any = { params: { id: "not-a-number" } };
      const res = createMockRes();

      await ticketController.classifyTicket(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("positive integer");
    });

    it("inbound email flow triggers classifyTicketAsync when category is omitted", async () => {
      const originalClassifyAsync = ticketClassificationService.classifyTicketAsync;
      let classifiedTicketId: number | null = null;
      let createdTicketId: number | null = null;
      ticketClassificationService.classifyTicketAsync = mock(async (id: number) => {
        classifiedTicketId = id;
        return null;
      });

      const uniqueEmail = `newstudent-${Date.now()}@example.com`;
      const req: any = {
        body: {
          from: `New Student <${uniqueEmail}>`,
          subject: "Cannot watch video lecture 5",
          text: "The video is buffering continuously and will not start.",
        },
      };
      const res = createMockRes();

      try {
        // Find the route handler registered on webhookRoutes for POST /email
        const routeLayer = webhookRoutes.stack.find(
          (layer: any) => layer.route?.path === "/email" && layer.route?.methods?.post
        );
        expect(routeLayer).toBeDefined();

        const handler = routeLayer.route.stack[0].handle;
        await handler(req, res);

        // Immediate 201 response sent to webhook caller
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeDefined();
        createdTicketId = res.body.data.id;

        // Non-blocking GPT classification was triggered
        expect(classifiedTicketId).toBe(res.body.data.id);
      } finally {
        ticketClassificationService.classifyTicketAsync = originalClassifyAsync;
        if (createdTicketId) {
          await prisma.ticket.delete({ where: { id: createdTicketId } }).catch(() => {});
        }
      }
    });

    it("inbound email flow does NOT trigger classifyTicketAsync if category was already provided", async () => {
      const originalClassifyAsync = ticketClassificationService.classifyTicketAsync;
      let called = false;
      let createdTicketId: number | null = null;
      ticketClassificationService.classifyTicketAsync = mock(async () => {
        called = true;
        return null;
      });

      const uniqueEmail = `cat-${Date.now()}@example.com`;
      const req: any = {
        body: {
          from: `Categorized Student <${uniqueEmail}>`,
          subject: "Already categorized ticket",
          text: "I provided a category explicitly.",
          category: "General Question",
        },
      };
      const res = createMockRes();

      try {
        const routeLayer = webhookRoutes.stack.find(
          (layer: any) => layer.route?.path === "/email" && layer.route?.methods?.post
        );
        const handler = routeLayer.route.stack[0].handle;
        await handler(req, res);

        expect(res.statusCode).toBe(201);
        createdTicketId = res.body?.data?.id;
        expect(called).toBe(false);
      } finally {
        ticketClassificationService.classifyTicketAsync = originalClassifyAsync;
        if (createdTicketId) {
          await prisma.ticket.delete({ where: { id: createdTicketId } }).catch(() => {});
        }
      }
    });

    it("inbound email flow does NOT trigger classifyTicketAsync on follow-up replies", async () => {
      // First, create existing ticket
      const existingTicket = await prisma.ticket.create({
        data: {
          subject: "Existing Ticket For Reply Test",
          body: "Initial question",
          senderName: "Student Reply",
          senderEmail: "student.reply@example.com",
          category: TicketCategory.TECHNICAL_QUESTION,
        },
      });

      const originalClassifyAsync = ticketClassificationService.classifyTicketAsync;
      let called = false;
      ticketClassificationService.classifyTicketAsync = mock(async () => {
        called = true;
        return null;
      });

      const req: any = {
        body: {
          from: "Student Reply <student.reply@example.com>",
          subject: "Re: Existing Ticket For Reply Test",
          text: "Thanks, here is my follow up.",
        },
      };
      const res = createMockRes();

      try {
        const routeLayer = webhookRoutes.stack.find(
          (layer: any) => layer.route?.path === "/email" && layer.route?.methods?.post
        );
        const handler = routeLayer.route.stack[0].handle;
        await handler(req, res);

        expect(res.statusCode).toBe(201);
        expect(res.body.data.isReply).toBe(true);
        expect(called).toBe(false);

        await prisma.ticket.delete({ where: { id: existingTicket.id } });
      } finally {
        ticketClassificationService.classifyTicketAsync = originalClassifyAsync;
      }
    });
  });
});
