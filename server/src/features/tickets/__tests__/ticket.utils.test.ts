import { describe, it, expect } from "bun:test";
import { parseEmailAddress, cleanSubject, deriveNameFromEmail } from "../ticket.utils";

describe("ticket.utils", () => {
  describe("parseEmailAddress", () => {
    it("parses display name and email address from standard RFC 5322 format", () => {
      const result = parseEmailAddress("Alice Smith <alice@example.com>");
      expect(result).toEqual({
        name: "Alice Smith",
        email: "alice@example.com",
      });
    });

    it("handles quoted display names", () => {
      const result = parseEmailAddress('"Smith, Alice" <alice.smith@example.com>');
      expect(result).toEqual({
        name: "Smith, Alice",
        email: "alice.smith@example.com",
      });
    });

    it("derives a non-empty senderName when only angle-bracketed email is provided", () => {
      const result = parseEmailAddress("<student@example.com>");
      expect(result).toEqual({
        name: "Student",
        email: "student@example.com",
      });
    });

    it("derives a non-empty senderName when bare email string is provided", () => {
      const result = parseEmailAddress("john.doe@example.com");
      expect(result).toEqual({
        name: "John Doe",
        email: "john.doe@example.com",
      });
    });

    it("normalizes email to lowercase and trims whitespace", () => {
      const result = parseEmailAddress("   Bob Agent <  BOB.AGENT@EXAMPLE.COM  >  ");
      expect(result).toEqual({
        name: "Bob Agent",
        email: "bob.agent@example.com",
      });
    });
  });

  describe("deriveNameFromEmail", () => {
    it("converts dot-separated local parts into capitalized names", () => {
      expect(deriveNameFromEmail("sarah.connor@example.com")).toBe("Sarah Connor");
    });

    it("converts dash-separated local parts into capitalized names", () => {
      expect(deriveNameFromEmail("tech-support@example.com")).toBe("Tech Support");
    });

    it("handles single-word email handles", () => {
      expect(deriveNameFromEmail("developer@example.com")).toBe("Developer");
    });
  });

  describe("cleanSubject", () => {
    it("preserves valid subjects", () => {
      expect(cleanSubject("Cannot access lecture 4")).toBe("Cannot access lecture 4");
    });

    it("trims extraneous whitespace", () => {
      expect(cleanSubject("   Refund Inquiry   ")).toBe("Refund Inquiry");
    });

    it("defaults to '(No Subject)' when subject is empty, whitespace, or null", () => {
      expect(cleanSubject("")).toBe("(No Subject)");
      expect(cleanSubject("   ")).toBe("(No Subject)");
      expect(cleanSubject(null)).toBe("(No Subject)");
      expect(cleanSubject(undefined)).toBe("(No Subject)");
    });
  });
});
