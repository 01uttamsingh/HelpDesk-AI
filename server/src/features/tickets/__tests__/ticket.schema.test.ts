import { describe, it, expect } from "bun:test";
import { inboundEmailSchema, normalizeCategory } from "../ticket.schema";
import { TicketCategory } from "@prisma/client";

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
  });
});
