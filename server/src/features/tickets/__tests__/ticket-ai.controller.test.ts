import { describe, it, expect, mock } from "bun:test";
import { ticketController } from "../ticket.controller";
import { ticketService, TicketServiceError } from "../ticket.service";

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

describe("ticketController - AI Endpoints", () => {
  describe("polishReply", () => {
    it("returns 200 with polished text when request is valid without ticketId", async () => {
      const originalPolish = ticketService.polishReply;
      ticketService.polishReply = mock(async () => "Polished response text");

      const req: any = {
        params: {},
        body: { text: "draft response text" },
        user: { name: "Agent Sarah" },
      };
      const res = createMockRes();

      try {
        await ticketController.polishReply(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
          success: true,
          data: { polishedText: "Polished response text" },
        });
        expect(ticketService.polishReply).toHaveBeenCalledWith(
          null,
          "draft response text",
          "Agent Sarah",
          undefined
        );
      } finally {
        ticketService.polishReply = originalPolish;
      }
    });

    it("returns 200 with polished text when request has valid ticketId", async () => {
      const originalPolish = ticketService.polishReply;
      ticketService.polishReply = mock(async () => "Polished reply for ticket #42");

      const req: any = {
        params: { id: "42" },
        body: { text: "ticket draft text", customerName: "Jane Doe" },
        user: { name: "Agent John" },
      };
      const res = createMockRes();

      try {
        await ticketController.polishReply(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
          success: true,
          data: { polishedText: "Polished reply for ticket #42" },
        });
        expect(ticketService.polishReply).toHaveBeenCalledWith(
          42,
          "ticket draft text",
          "Agent John",
          "Jane Doe"
        );
      } finally {
        ticketService.polishReply = originalPolish;
      }
    });

    it("prioritizes body agentName over session user name", async () => {
      const originalPolish = ticketService.polishReply;
      ticketService.polishReply = mock(async () => "Polished text");

      const req: any = {
        params: {},
        body: { text: "draft response text", agentName: "Override Agent" },
        user: { name: "Session Agent" },
      };
      const res = createMockRes();

      try {
        await ticketController.polishReply(req, res);
        expect(res.statusCode).toBe(200);
        expect(ticketService.polishReply).toHaveBeenCalledWith(
          null,
          "draft response text",
          "Override Agent",
          undefined
        );
      } finally {
        ticketService.polishReply = originalPolish;
      }
    });

    it("returns 400 when ticket ID parameter is invalid", async () => {
      const req: any = {
        params: { id: "not-a-number" },
        body: { text: "valid text" },
      };
      const res = createMockRes();

      await ticketController.polishReply(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Invalid ticket ID");
    });

    it("returns 400 when request body fails validation", async () => {
      const req: any = {
        params: {},
        body: { text: "   " },
      };
      const res = createMockRes();

      await ticketController.polishReply(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Validation error");
      expect(res.body.details).toBeDefined();
    });

    it("handles TicketServiceError and returns service status code", async () => {
      const originalPolish = ticketService.polishReply;
      ticketService.polishReply = mock(async () => {
        throw new TicketServiceError("AI provider error", 502);
      });

      const req: any = {
        params: {},
        body: { text: "draft text" },
      };
      const res = createMockRes();

      try {
        await ticketController.polishReply(req, res);
        expect(res.statusCode).toBe(502);
        expect(res.body).toEqual({
          success: false,
          error: "AI provider error",
        });
      } finally {
        ticketService.polishReply = originalPolish;
      }
    });

    it("handles unexpected runtime exceptions with status 500", async () => {
      const originalPolish = ticketService.polishReply;
      ticketService.polishReply = mock(async () => {
        throw new Error("Unexpected crash");
      });

      const req: any = {
        params: {},
        body: { text: "draft text" },
      };
      const res = createMockRes();

      try {
        await ticketController.polishReply(req, res);
        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Unexpected crash");
      } finally {
        ticketService.polishReply = originalPolish;
      }
    });
  });

  describe("summarizeTicket", () => {
    it("returns 200 with summary when ticket exists and generation succeeds", async () => {
      const originalSummarize = ticketService.summarizeTicket;
      ticketService.summarizeTicket = mock(async () => "Concise summary of ticket 101.");

      const req: any = {
        params: { id: "101" },
      };
      const res = createMockRes();

      try {
        await ticketController.summarizeTicket(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
          success: true,
          data: { summary: "Concise summary of ticket 101." },
        });
        expect(ticketService.summarizeTicket).toHaveBeenCalledWith(101);
      } finally {
        ticketService.summarizeTicket = originalSummarize;
      }
    });

    it("returns 400 when ticket ID parameter is invalid", async () => {
      const req: any = {
        params: { id: "invalid-id" },
      };
      const res = createMockRes();

      await ticketController.summarizeTicket(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Invalid ticket ID");
    });

    it("handles TicketServiceError 404 when ticket is not found", async () => {
      const originalSummarize = ticketService.summarizeTicket;
      ticketService.summarizeTicket = mock(async () => {
        throw new TicketServiceError("Ticket not found", 404);
      });

      const req: any = {
        params: { id: "999" },
      };
      const res = createMockRes();

      try {
        await ticketController.summarizeTicket(req, res);
        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({
          success: false,
          error: "Ticket not found",
        });
      } finally {
        ticketService.summarizeTicket = originalSummarize;
      }
    });

    it("handles TicketServiceError 502 when AI generation fails", async () => {
      const originalSummarize = ticketService.summarizeTicket;
      ticketService.summarizeTicket = mock(async () => {
        throw new TicketServiceError("Failed to summarize ticket with AI", 502);
      });

      const req: any = {
        params: { id: "42" },
      };
      const res = createMockRes();

      try {
        await ticketController.summarizeTicket(req, res);
        expect(res.statusCode).toBe(502);
        expect(res.body).toEqual({
          success: false,
          error: "Failed to summarize ticket with AI",
        });
      } finally {
        ticketService.summarizeTicket = originalSummarize;
      }
    });

    it("handles unexpected runtime exceptions with status 500", async () => {
      const originalSummarize = ticketService.summarizeTicket;
      ticketService.summarizeTicket = mock(async () => {
        throw new Error("Fatal database crash");
      });

      const req: any = {
        params: { id: "42" },
      };
      const res = createMockRes();

      try {
        await ticketController.summarizeTicket(req, res);
        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe("Fatal database crash");
      } finally {
        ticketService.summarizeTicket = originalSummarize;
      }
    });
  });
});
