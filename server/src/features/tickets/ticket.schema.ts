import { z } from "zod";
import { TicketCategory, TicketStatus } from "@prisma/client";

/**
 * Normalizes category inputs into canonical TicketCategory enum values.
 * Accepts formats such as "Technical Questions", "technical_question", etc.
 */
export const normalizeCategory = (val: unknown): unknown => {
  if (val === undefined) return undefined;
  if (val === null || val === "") return null;
  if (typeof val !== "string") return val;
  const upper = val.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "GENERAL_QUESTION" || upper === "GENERAL") {
    return TicketCategory.GENERAL_QUESTION;
  }
  if (upper === "TECHNICAL_QUESTION" || upper === "TECHNICAL_QUESTIONS" || upper === "TECHNICAL") {
    return TicketCategory.TECHNICAL_QUESTION;
  }
  if (upper === "REFUND_REQUEST" || upper === "REFUND") {
    return TicketCategory.REFUND_REQUEST;
  }
  return val;
};

export const ticketCategorySchema = z.preprocess(
  (val) => normalizeCategory(val),
  z.nativeEnum(TicketCategory).nullable().optional()
);

export const inboundEmailSchema = z
  .object({
    from: z.string().min(1, "Sender 'from' address is required"),
    to: z.string().optional(),
    subject: z.string().optional(),
    text: z.string().optional(),
    body: z.string().optional(),
    html: z.string().optional(),
    messageId: z.string().optional(),
    category: ticketCategorySchema,
  })
  .refine((data) => (data.text && data.text.trim().length > 0) || (data.body && data.body.trim().length > 0), {
    message: "Email body text is required (provide 'text' or 'body')",
    path: ["text"],
  });

export type InboundEmailSchemaInput = z.infer<typeof inboundEmailSchema>;

export const ticketIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Ticket ID must be a positive integer"),
});

export type TicketIdParamInput = z.infer<typeof ticketIdParamSchema>;

export const ticketQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: ticketCategorySchema,
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest"]).default("newest").optional(),
});

export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
