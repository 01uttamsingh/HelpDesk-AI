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

/**
 * Ensures the polished reply ends with the agent's sign-off.
 * If the agent's name is provided:
 * - Replaces any placeholder brackets like [Agent Name], [Your Name], [Name], [Support Agent].
 * - If a sign-off like "Regards, <agentName>" or "Best regards, <agentName>" is already present at the end, preserves it.
 * - If trailing with "Regards," without a name, completes it with the agent's name.
 * - Otherwise, appends "\n\nRegards,\n<agentName>".
 */
export function ensureAgentSignOff(text: string, agentName?: string): string {
  const name = agentName?.trim();
  if (!name) {
    return text.trim();
  }

  let result = text.trim();

  // 1. Replace placeholder tokens like [Agent Name], [Your Name], [Name], [Support Agent], [Agent]
  const placeholderRegex = /\[(?:Agent Name|Your Name|Name|Support Agent|Agent)\]/gi;
  result = result.replace(placeholderRegex, name);

  // 2. Check if the text already ends with a sign-off mentioning the agent's name
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existingSignOffRegex = new RegExp(
    `(?:regards|best regards|warm regards|kind regards|sincerely|cheers|thanks)[,\\s\\n]+${escapedName}\\s*$`,
    "i"
  );

  if (existingSignOffRegex.test(result)) {
    return result;
  }

  // 3. Check if it ends with "Regards," or similar sign-off without the name following
  const trailingRegardsRegex = /(?:regards|best regards|warm regards|kind regards|sincerely)[,\s]*$/i;
  if (trailingRegardsRegex.test(result)) {
    return result.replace(trailingRegardsRegex, `Regards,\n${name}`);
  }

  // 4. Append standard sign-off
  return `${result}\n\nRegards,\n${name}`;
}

/**
 * Extracts a capitalized first name from a full name, display name, or title.
 * E.g.:
 * - "John Doe" -> "John"
 * - "alice smith" -> "Alice"
 * - "Dr. Gregory House" -> "Gregory"
 * - "jane-marie" -> "Jane-Marie"
 */
export function extractFirstName(name?: string | null): string {
  if (!name || !name.trim()) return "";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  const titles = new Set([
    "mr", "mr.", "mrs", "mrs.", "ms", "ms.", "miss", "dr", "dr.", "prof", "prof."
  ]);
  let first = parts[0];
  if (parts.length > 1 && titles.has(parts[0].toLowerCase())) {
    first = parts[1];
  }
  first = first.replace(/[^a-zA-Z0-9'-]/g, "");
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Ensures the polished reply begins with a customer greeting addressing their first name:
 * "Dear <cust_first_name>,"
 * - Replaces any bracket placeholders like [Customer Name] or [First Name].
 * - If an existing greeting like "Hi John," or "Dear John," or "Hello," is present, normalizes to "Dear <cust_first_name>,\n\n".
 * - If no greeting is present, prepends "Dear <cust_first_name>,\n\n".
 */
export function ensureCustomerGreeting(text: string, customerFirstName?: string): string {
  const firstName = customerFirstName?.trim();
  if (!firstName) {
    return text.trim();
  }

  let result = text.trim();

  // 1. Replace placeholder tokens like [Customer Name], [Customer First Name], [First Name], [Customer]
  const placeholderRegex = /\[(?:Customer Name|Customer First Name|First Name|Customer|Client Name)\]/gi;
  result = result.replace(placeholderRegex, firstName);

  // 2. If it starts with any greeting like "Dear ...", "Hi ...", "Hello ...", "Hey ...", "Greetings ..."
  const genericGreetingRegex = /^(?:dear|hi|hello|hey|greetings)\b[^\n,:]*[,:]?\s*/i;
  if (genericGreetingRegex.test(result)) {
    const bodyAfterGreeting = result.replace(genericGreetingRegex, "").trimStart();
    return `Dear ${firstName},\n\n${bodyAfterGreeting}`;
  }

  // 3. If no greeting was present at all, prepend "Dear <firstName>,\n\n"
  return `Dear ${firstName},\n\n${result}`;
}

