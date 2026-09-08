import type { ParsedEmailAddress } from "./ticket.types";

/**
 * Parses RFC 5322 formatted address strings into a clean email and a required non-empty sender name.
 *
 * Examples:
 * - "Alice Smith <alice@example.com>" -> { name: "Alice Smith", email: "alice@example.com" }
 * - "<alice@example.com>"             -> { name: "Alice", email: "alice@example.com" }
 * - "alice.smith@example.com"         -> { name: "Alice Smith", email: "alice.smith@example.com" }
 */
export function parseEmailAddress(from: string): ParsedEmailAddress {
  const trimmed = from.trim();

  // Case 1: Angle bracket format, e.g. "Alice Smith <alice@example.com>" or "<alice@example.com>"
  const angleMatch = trimmed.match(/^(.*?)\s*<([^<>]+)>\s*$/);
  if (angleMatch) {
    const rawName = angleMatch[1].replace(/^["']|["']$/g, "").trim();
    const cleanEmail = angleMatch[2].trim().toLowerCase();
    const senderName = rawName.length > 0 ? rawName : deriveNameFromEmail(cleanEmail);
    return {
      name: senderName,
      email: cleanEmail,
    };
  }

  // Case 2: Bare email string, e.g. "alice.smith@example.com"
  const cleanEmail = trimmed.toLowerCase();
  return {
    name: deriveNameFromEmail(cleanEmail),
    email: cleanEmail,
  };
}

/**
 * Derives a human-friendly display name from the local part of an email address.
 * e.g. "john.doe@example.com" -> "John Doe"
 * e.g. "student@example.com"  -> "Student"
 */
export function deriveNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] || "Customer";
  const words = localPart.split(/[._-]/).filter(Boolean);

  if (words.length === 0) return "Customer";

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Sanitizes and provides a default subject if none is present.
 */
export function cleanSubject(subject?: string | null): string {
  if (!subject || subject.trim().length === 0) {
    return "(No Subject)";
  }
  return subject.trim();
}

/**
 * Normalizes email subject line by stripping common reply/forward prefixes (e.g. "Re:", "RE:", "Fwd:").
 */
export function normalizeSubject(subject?: string | null): string {
  if (!subject) return "";
  return subject
    .replace(/^(\s*(re|fwd|fw)\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}

/**
 * Strips raw markdown symbols (headers, bold/italic asterisks, bullets, blockquotes)
 * from an AI summary so it displays as clean, readable plain text.
 */
export function cleanSummaryText(text: string): string {
  if (!text) return "";
  return text
    // Strip markdown headers (e.g. ## Header -> Header)
    .replace(/^#+\s+/gm, "")
    // Strip bold and italic delimiters (**bold**, *italic*, __bold__, _italic_)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Strip list bullets at start of lines (e.g. "- Item" -> "Item", "* Item" -> "Item")
    .replace(/^[-*•+]\s+/gm, "")
    // Strip blockquotes
    .replace(/^>\s+/gm, "")
    // Strip inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Normalize consecutive newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

