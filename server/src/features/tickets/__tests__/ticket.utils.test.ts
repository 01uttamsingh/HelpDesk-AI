import { describe, it, expect } from "bun:test";
import {
  parseEmailAddress,
  cleanSubject,
  deriveNameFromEmail,
  normalizeSubject,
  cleanSummaryText,
  ensureAgentSignOff,
  extractFirstName,
  ensureCustomerGreeting,
} from "../ticket.utils";

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

  describe("normalizeSubject", () => {
    it("strips Re: and RE: prefixes and lowercases", () => {
      expect(normalizeSubject("Re: How do I setup Vite?")).toBe("how do i setup vite?");
      expect(normalizeSubject("RE: How do I setup Vite?")).toBe("how do i setup vite?");
      expect(normalizeSubject("re:  How do I setup Vite?")).toBe("how do i setup vite?");
    });

    it("strips nested or chained reply prefixes", () => {
      expect(normalizeSubject("Re: RE: Re: Cannot connect to DB")).toBe("cannot connect to db");
    });

    it("strips Fwd: and FW: prefixes", () => {
      expect(normalizeSubject("Fwd: Course materials")).toBe("course materials");
      expect(normalizeSubject("FW: Course materials")).toBe("course materials");
    });

    it("handles plain subjects without prefixes", () => {
      expect(normalizeSubject("Billing inquiry")).toBe("billing inquiry");
    });

    it("handles null, undefined, or empty string", () => {
      expect(normalizeSubject("")).toBe("");
      expect(normalizeSubject(null)).toBe("");
      expect(normalizeSubject(undefined)).toBe("");
    });
  });

  describe("cleanSummaryText", () => {
    it("strips markdown headings, bold markup, and bullet points", () => {
      const raw = `## Core Issue
- Customer requests a refund for course reference **1788841914669**.
- No reason provided.

## Key Discussion & Actions
- Customer asked for money back.
- Agent confirmed details.

## Current Status & Next Steps
- **Status:** Open.`;

      const cleaned = cleanSummaryText(raw);
      expect(cleaned).not.toContain("##");
      expect(cleaned).not.toContain("**");
      expect(cleaned).toContain("Customer requests a refund for course reference 1788841914669.");
      expect(cleaned).toContain("Status: Open.");
    });

    it("handles empty or null string gracefully", () => {
      expect(cleanSummaryText("")).toBe("");
      expect(cleanSummaryText(null as unknown as string)).toBe("");
    });
  });

  describe("ensureAgentSignOff", () => {
    it("returns trimmed text unmodified if agentName is empty or undefined", () => {
      const text = "We have looked into your issue and fixed it.";
      expect(ensureAgentSignOff(text)).toBe(text);
      expect(ensureAgentSignOff(text, "")).toBe(text);
      expect(ensureAgentSignOff(text, "   ")).toBe(text);
    });

    it("appends Regards, <agent_name> when no sign-off is present", () => {
      const text = "We have investigated the problem and deployed a patch.";
      const result = ensureAgentSignOff(text, "Admin");
      expect(result).toBe("We have investigated the problem and deployed a patch.\n\nRegards,\nAdmin");
    });

    it("preserves existing sign-off when agent name is already included", () => {
      const text = "Thanks for your patience.\n\nRegards,\nSarah";
      expect(ensureAgentSignOff(text, "Sarah")).toBe(text);

      const singleLineText = "Thanks for your patience.\n\nRegards, Sarah";
      expect(ensureAgentSignOff(singleLineText, "Sarah")).toBe(singleLineText);

      const bestRegardsText = "Thanks for your patience.\n\nBest regards,\nSarah";
      expect(ensureAgentSignOff(bestRegardsText, "Sarah")).toBe(bestRegardsText);
    });

    it("replaces placeholder tokens like [Agent Name] with the agent name", () => {
      const text = "We have refunded your order.\n\nRegards,\n[Agent Name]";
      const result = ensureAgentSignOff(text, "John Doe");
      expect(result).toBe("We have refunded your order.\n\nRegards,\nJohn Doe");
    });

    it("completes trailing Regards, when name was omitted by model", () => {
      const text = "We have refunded your order.\n\nRegards,";
      const result = ensureAgentSignOff(text, "John Doe");
      expect(result).toBe("We have refunded your order.\n\nRegards,\nJohn Doe");
    });
  });

  describe("extractFirstName", () => {
    it("extracts and capitalizes first name from full name", () => {
      expect(extractFirstName("John Doe")).toBe("John");
      expect(extractFirstName("alice smith")).toBe("Alice");
      expect(extractFirstName("david")).toBe("David");
    });

    it("skips courtesy titles like Dr., Mr., Ms.", () => {
      expect(extractFirstName("Dr. Gregory House")).toBe("Gregory");
      expect(extractFirstName("Mr. Thomas Anderson")).toBe("Thomas");
      expect(extractFirstName("Ms. Jane Doe")).toBe("Jane");
    });

    it("handles empty, null, or undefined values gracefully", () => {
      expect(extractFirstName("")).toBe("");
      expect(extractFirstName("   ")).toBe("");
      expect(extractFirstName(null)).toBe("");
      expect(extractFirstName(undefined)).toBe("");
    });
  });

  describe("ensureCustomerGreeting", () => {
    it("returns trimmed text unmodified if customerFirstName is empty or undefined", () => {
      const text = "Thank you for reaching out. We have solved your issue.";
      expect(ensureCustomerGreeting(text)).toBe(text);
      expect(ensureCustomerGreeting(text, "")).toBe(text);
      expect(ensureCustomerGreeting(text, "   ")).toBe(text);
    });

    it("prepends Dear <cust_first_name>, when no greeting is present", () => {
      const text = "Thank you for contacting us. We have refunded your purchase.";
      const result = ensureCustomerGreeting(text, "Alex");
      expect(result).toBe("Dear Alex,\n\nThank you for contacting us. We have refunded your purchase.");
    });

    it("preserves/normalizes existing Dear <cust_first_name>, greeting", () => {
      const text = "Dear Alex,\n\nWe have verified your account.";
      expect(ensureCustomerGreeting(text, "Alex")).toBe("Dear Alex,\n\nWe have verified your account.");
    });

    it("normalizes other greetings like Hi, Hello, or Dear Customer to Dear <cust_first_name>,", () => {
      const text = "Hello Alex,\n\nWe have verified your account.";
      expect(ensureCustomerGreeting(text, "Alex")).toBe("Dear Alex,\n\nWe have verified your account.");

      const hiText = "Hi there,\n\nYour ticket has been updated.";
      expect(ensureCustomerGreeting(hiText, "Alex")).toBe("Dear Alex,\n\nYour ticket has been updated.");

      const dearCustomerText = "Dear Customer,\n\nYour ticket has been updated.";
      expect(ensureCustomerGreeting(dearCustomerText, "Alex")).toBe("Dear Alex,\n\nYour ticket has been updated.");
    });

    it("replaces placeholder brackets with customer first name", () => {
      const text = "Dear [Customer Name],\n\nWe have updated your records.";
      expect(ensureCustomerGreeting(text, "Alex")).toBe("Dear Alex,\n\nWe have updated your records.");
    });
  });
});

