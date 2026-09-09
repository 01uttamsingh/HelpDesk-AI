import { describe, it, expect } from "bun:test";
import {
  inboundEmailSchema,
  normalizeCategory,
  ticketQuerySchema,
  assignTicketSchema,
  updateTicketSchema,
  polishReplySchema,
} from "../ticket.schema";
import { TicketCategory, TicketStatus, TicketPriority } from "@prisma/client";

describe("ticket.schema", () => {
  describe("normalizeCategory", () => {
    it("returns null for null or empty string, and undefined for undefined", () => {
      expect(normalizeCategory(null)).toBeNull();
      expect(normalizeCategory(undefined)).toBeUndefined();
      expect(normalizeCategory("")).toBeNull();
    });

    it("normalizes General Question variants to GENERAL_QUESTION", () => {
      expect(normalizeCategory("GENERAL_QUESTION")).toBe(TicketCategory.GENERAL_QUESTION);
      expect(normalizeCategory("General Question")).toBe(TicketCategory.GENERAL_QUESTION);
      expect(normalizeCategory("general-question")).toBe(TicketCategory.GENERAL_QUESTION);
      expect(normalizeCategory("general")).toBe(TicketCategory.GENERAL_QUESTION);
    });

    it("normalizes Technical Question variants (including plural) to TECHNICAL_QUESTION", () => {
      expect(normalizeCategory("TECHNICAL_QUESTION")).toBe(TicketCategory.TECHNICAL_QUESTION);
      expect(normalizeCategory("TECHNICAL_QUESTIONS")).toBe(TicketCategory.TECHNICAL_QUESTION);
      expect(normalizeCategory("Technical Questions")).toBe(TicketCategory.TECHNICAL_QUESTION);
      expect(normalizeCategory("Technical Question")).toBe(TicketCategory.TECHNICAL_QUESTION);
      expect(normalizeCategory("technical")).toBe(TicketCategory.TECHNICAL_QUESTION);
    });

    it("normalizes Refund Request variants to REFUND_REQUEST", () => {
      expect(normalizeCategory("REFUND_REQUEST")).toBe(TicketCategory.REFUND_REQUEST);
      expect(normalizeCategory("Refund request")).toBe(TicketCategory.REFUND_REQUEST);
      expect(normalizeCategory("refund")).toBe(TicketCategory.REFUND_REQUEST);
    });

    it("normalizes uncategorized variants to null", () => {
      expect(normalizeCategory("UNCATEGORIZED")).toBeNull();
      expect(normalizeCategory("uncategorized")).toBeNull();
      expect(normalizeCategory("none")).toBeNull();
      expect(normalizeCategory("null")).toBeNull();
    });

    it("leaves unknown values as-is so Zod validation rejects them", () => {
      expect(normalizeCategory("UNKNOWN_CATEGORY")).toBe("UNKNOWN_CATEGORY");
    });
  });

  describe("inboundEmailSchema", () => {
    it("successfully validates and normalizes category", () => {
      const parsed = inboundEmailSchema.parse({
        from: "student@example.com",
        text: "My video won't load",
        category: "Technical Questions",
      });

      expect(parsed.category).toBe(TicketCategory.TECHNICAL_QUESTION);
    });

    it("allows category to be omitted or null", () => {
      const parsedWithout = inboundEmailSchema.parse({
        from: "student@example.com",
        text: "General support question",
      });
      expect(parsedWithout.category).toBeUndefined();

      const parsedWithNull = inboundEmailSchema.parse({
        from: "student@example.com",
        text: "General support question",
        category: null,
      });
      expect(parsedWithNull.category).toBeNull();
    });

    it("rejects invalid category with validation error", () => {
      expect(() =>
        inboundEmailSchema.parse({
          from: "student@example.com",
          text: "Some text",
          category: "INVALID_CAT",
        })
      ).toThrow();
    });

    it("rejects fields exceeding max length constraints", () => {
      const validBase = {
        from: "student@example.com",
        text: "Valid email text",
      };

      // 'from' exceeding 320 chars
      expect(() =>
        inboundEmailSchema.parse({
          ...validBase,
          from: `${"a".repeat(310)}@example.com`,
        })
      ).toThrow("Sender 'from' address cannot exceed 320 characters");

      // 'to' exceeding 320 chars
      expect(() =>
        inboundEmailSchema.parse({
          ...validBase,
          to: `${"a".repeat(310)}@example.com`,
        })
      ).toThrow("Recipient 'to' address cannot exceed 320 characters");

      // 'subject' exceeding 255 chars
      expect(() =>
        inboundEmailSchema.parse({
          ...validBase,
          subject: "s".repeat(256),
        })
      ).toThrow("Subject cannot exceed 255 characters");

      // 'text' exceeding 10,000 chars
      expect(() =>
        inboundEmailSchema.parse({
          ...validBase,
          text: "t".repeat(10001),
        })
      ).toThrow("Email text cannot exceed 10,000 characters");

      // 'body' exceeding 10,000 chars
      expect(() =>
        inboundEmailSchema.parse({
          from: "student@example.com",
          body: "b".repeat(10001),
        })
      ).toThrow("Email body cannot exceed 10,000 characters");

      // 'html' exceeding 50,000 chars
      expect(() =>
        inboundEmailSchema.parse({
          ...validBase,
          html: "h".repeat(50001),
        })
      ).toThrow("Email HTML cannot exceed 50,000 characters");

      // 'messageId' exceeding 255 chars
      expect(() =>
        inboundEmailSchema.parse({
          ...validBase,
          messageId: `<${"m".repeat(254)}>`,
        })
      ).toThrow("Message ID cannot exceed 255 characters");
    });

    it("accepts fields at the boundary of max length constraints", () => {
      const boundaryPayload = {
        from: "a".repeat(320),
        to: "b".repeat(320),
        subject: "s".repeat(255),
        text: "t".repeat(10000),
        html: "h".repeat(50000),
        messageId: "m".repeat(255),
      };

      const parsed = inboundEmailSchema.parse(boundaryPayload);
      expect(parsed.from).toHaveLength(320);
      expect(parsed.to).toHaveLength(320);
      expect(parsed.subject).toHaveLength(255);
      expect(parsed.text).toHaveLength(10000);
      expect(parsed.html).toHaveLength(50000);
      expect(parsed.messageId).toHaveLength(255);
    });
  });

  describe("ticketQuerySchema", () => {
    it("parses valid sortBy and sortOrder parameters", () => {
      const parsed = ticketQuerySchema.parse({
        sortBy: "priority",
        sortOrder: "asc",
      });
      expect(parsed.sortBy).toBe("priority");
      expect(parsed.sortOrder).toBe("asc");
    });

    it("parses all allowed sortBy fields", () => {
      const allowedFields = [
        "createdAt",
        "priority",
        "status",
        "category",
        "subject",
        "senderName",
        "senderEmail",
        "id",
      ] as const;

      allowedFields.forEach((field) => {
        const parsed = ticketQuerySchema.parse({ sortBy: field });
        expect(parsed.sortBy).toBe(field);
      });
    });

    it("rejects invalid sortBy field", () => {
      expect(() =>
        ticketQuerySchema.parse({ sortBy: "unsupported_field" })
      ).toThrow();
    });

    it("rejects invalid sortOrder value", () => {
      expect(() =>
        ticketQuerySchema.parse({ sortOrder: "sideways" })
      ).toThrow();
    });

    it("supports legacy sort parameter", () => {
      const parsedOldest = ticketQuerySchema.parse({ sort: "oldest" });
      expect(parsedOldest.sort).toBe("oldest");

      const parsedNewest = ticketQuerySchema.parse({ sort: "newest" });
      expect(parsedNewest.sort).toBe("newest");
    });

    it("parses valid priority filter and rejects invalid priority", () => {
      const parsedHigh = ticketQuerySchema.parse({ priority: "HIGH" });
      expect(parsedHigh.priority).toBe("HIGH");

      const parsedLow = ticketQuerySchema.parse({ priority: "LOW" });
      expect(parsedLow.priority).toBe("LOW");

      expect(() => ticketQuerySchema.parse({ priority: "CRITICAL" })).toThrow();
    });

    it("parses category UNCATEGORIZED as null", () => {
      const parsed = ticketQuerySchema.parse({ category: "UNCATEGORIZED" });
      expect(parsed.category).toBeNull();
    });

    it("parses page and pageSize with defaults and rejects invalid values", () => {
      const defaultParsed = ticketQuerySchema.parse({});
      expect(defaultParsed.page).toBe(1);
      expect(defaultParsed.pageSize).toBe(10);

      const customParsed = ticketQuerySchema.parse({ page: "3", pageSize: "25" });
      expect(customParsed.page).toBe(3);
      expect(customParsed.pageSize).toBe(25);

      expect(() => ticketQuerySchema.parse({ page: 0 })).toThrow();
      expect(() => ticketQuerySchema.parse({ page: -1 })).toThrow();
      expect(() => ticketQuerySchema.parse({ pageSize: 150 })).toThrow();
    });
  });

  describe("assignTicketSchema", () => {
    it("parses valid user id string", () => {
      const parsed = assignTicketSchema.parse({ assignedToId: "user-uuid-123" });
      expect(parsed.assignedToId).toBe("user-uuid-123");
    });

    it("parses null as null (unassign)", () => {
      const parsed = assignTicketSchema.parse({ assignedToId: null });
      expect(parsed.assignedToId).toBeNull();
    });

    it("normalizes empty string and whitespace to null", () => {
      expect(assignTicketSchema.parse({ assignedToId: "" }).assignedToId).toBeNull();
      expect(assignTicketSchema.parse({ assignedToId: "   " }).assignedToId).toBeNull();
    });

    it("defaults omitted assignedToId to null", () => {
      const parsed = assignTicketSchema.parse({});
      expect(parsed.assignedToId).toBeNull();
    });
  });

  describe("updateTicketSchema", () => {
    it("parses valid status change", () => {
      const parsed = updateTicketSchema.parse({ status: TicketStatus.RESOLVED });
      expect(parsed.status).toBe(TicketStatus.RESOLVED);
      expect(parsed.category).toBeUndefined();
    });

    it("parses valid category change with normalization", () => {
      const parsed = updateTicketSchema.parse({ category: "Technical Questions" });
      expect(parsed.category).toBe(TicketCategory.TECHNICAL_QUESTION);
    });

    it("parses category as null when set to UNCATEGORIZED or null", () => {
      expect(updateTicketSchema.parse({ category: null }).category).toBeNull();
      expect(updateTicketSchema.parse({ category: "UNCATEGORIZED" }).category).toBeNull();
      expect(updateTicketSchema.parse({ category: "" }).category).toBeNull();
    });

    it("parses multiple fields simultaneously", () => {
      const parsed = updateTicketSchema.parse({
        status: TicketStatus.CLOSED,
        category: "Refund Request",
        priority: TicketPriority.HIGH,
        assignedToId: "agent-123",
      });
      expect(parsed.status).toBe(TicketStatus.CLOSED);
      expect(parsed.category).toBe(TicketCategory.REFUND_REQUEST);
      expect(parsed.priority).toBe(TicketPriority.HIGH);
      expect(parsed.assignedToId).toBe("agent-123");
    });

    it("rejects empty update payload with no fields", () => {
      expect(() => updateTicketSchema.parse({})).toThrow();
    });

    it("rejects invalid status", () => {
      expect(() => updateTicketSchema.parse({ status: "PENDING" })).toThrow();
    });

    it("rejects invalid category", () => {
      expect(() => updateTicketSchema.parse({ category: "INVALID_CAT" })).toThrow();
    });
  });

  describe("polishReplySchema", () => {
    it("accepts valid text field", () => {
      const parsed = polishReplySchema.parse({ text: "Please try reloading the page." });
      expect(parsed.text).toBe("Please try reloading the page.");
    });

    it("accepts valid body field", () => {
      const parsed = polishReplySchema.parse({ body: "Draft response to user" });
      expect(parsed.body).toBe("Draft response to user");
    });

    it("accepts valid draft field", () => {
      const parsed = polishReplySchema.parse({ draft: "Quick notes" });
      expect(parsed.draft).toBe("Quick notes");
    });

    it("accepts optional agentName and customerName fields", () => {
      const parsed = polishReplySchema.parse({
        text: "Please try reloading the page.",
        agentName: "Agent Smith",
        customerName: "Jane Doe",
      });
      expect(parsed.text).toBe("Please try reloading the page.");
      expect(parsed.agentName).toBe("Agent Smith");
      expect(parsed.customerName).toBe("Jane Doe");
    });

    it("rejects payload when text, body, and draft are all empty or whitespace", () => {
      expect(() => polishReplySchema.parse({})).toThrow();
      expect(() => polishReplySchema.parse({ text: "   " })).toThrow();
      expect(() => polishReplySchema.parse({ body: "", draft: "  " })).toThrow();
    });
  });
});
