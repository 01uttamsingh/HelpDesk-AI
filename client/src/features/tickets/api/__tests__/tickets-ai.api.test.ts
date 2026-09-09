import { describe, it, expect, vi, beforeEach } from "vitest";
import { polishTicketReply, summarizeTicket } from "../tickets.api";
import { api } from "@/lib/api";

describe("Tickets AI API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe("polishTicketReply", () => {
    it("calls /api/tickets/polish-reply when ticketId is omitted", async () => {
      const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            polishedText: "Polished reply without ticketId",
          },
        },
      });

      const result = await polishTicketReply("raw draft text");

      expect(postSpy).toHaveBeenCalledWith("/api/tickets/polish-reply", {
        text: "raw draft text",
      });
      expect(result).toEqual({
        polishedText: "Polished reply without ticketId",
      });
    });

    it("calls /api/tickets/:id/polish-reply when ticketId is provided", async () => {
      const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            polishedText: "Polished reply for ticket #101",
          },
        },
      });

      const result = await polishTicketReply("raw draft text", 101);

      expect(postSpy).toHaveBeenCalledWith("/api/tickets/101/polish-reply", {
        text: "raw draft text",
      });
      expect(result).toEqual({
        polishedText: "Polished reply for ticket #101",
      });
    });

    it("includes agentName and customerName in the request body when provided", async () => {
      const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            polishedText: "Dear Alice,\n\nPolished reply.\n\nRegards,\nAgent Bob",
          },
        },
      });

      const result = await polishTicketReply(
        "raw draft text",
        101,
        "Agent Bob",
        "Alice Smith"
      );

      expect(postSpy).toHaveBeenCalledWith("/api/tickets/101/polish-reply", {
        text: "raw draft text",
        agentName: "Agent Bob",
        customerName: "Alice Smith",
      });
      expect(result).toEqual({
        polishedText: "Dear Alice,\n\nPolished reply.\n\nRegards,\nAgent Bob",
      });
    });

    it("propagates network errors when request fails", async () => {
      vi.spyOn(api, "post").mockRejectedValueOnce(new Error("Network Error"));

      await expect(polishTicketReply("draft text", 101)).rejects.toThrow("Network Error");
    });
  });

  describe("summarizeTicket", () => {
    it("calls /api/tickets/:id/summarize and returns summary text", async () => {
      const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            summary: "Ticket 42 summarized concisely.",
          },
        },
      });

      const result = await summarizeTicket(42);

      expect(postSpy).toHaveBeenCalledWith("/api/tickets/42/summarize");
      expect(result).toEqual({
        summary: "Ticket 42 summarized concisely.",
      });
    });

    it("propagates server errors when summarize request fails", async () => {
      vi.spyOn(api, "post").mockRejectedValueOnce(new Error("AI generation timeout"));

      await expect(summarizeTicket(42)).rejects.toThrow("AI generation timeout");
    });
  });
});
