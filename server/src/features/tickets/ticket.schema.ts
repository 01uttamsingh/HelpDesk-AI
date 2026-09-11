import { z } from "zod";
import { TicketCategory, TicketStatus, TicketPriority } from "@prisma/client";

/**
 * Normalizes category inputs into canonical TicketCategory enum values.
 * Accepts formats such as "Technical Questions", "technical_question", etc.
 */
export const normalizeCategory = (val: unknown): unknown => {
  if (val === undefined) return undefined;
  if (val === null || val === "") return null;
  if (typeof val !== "string") return val;
  const upper = val.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "UNCATEGORIZED" || upper === "NONE" || upper === "NULL") {
    return null;
  }
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
    from: z
      .string()
      .min(1, "Sender 'from' address is required")
      .max(320, "Sender 'from' address cannot exceed 320 characters"),
    to: z
      .string()
      .max(320, "Recipient 'to' address cannot exceed 320 characters")
      .nullable()
      .optional(),
    subject: z
      .string()
      .max(255, "Subject cannot exceed 255 characters")
      .nullable()
      .optional(),
    text: z
      .string()
      .max(10000, "Email text cannot exceed 10,000 characters")
      .nullable()
      .optional(),
    body: z
      .string()
      .max(10000, "Email body cannot exceed 10,000 characters")
      .nullable()
      .optional(),
    html: z
      .string()
      .max(50000, "Email HTML cannot exceed 50,000 characters")
      .nullable()
      .optional(),
    messageId: z
      .string()
      .max(255, "Message ID cannot exceed 255 characters")
      .nullable()
      .optional(),
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

export const ticketSortFieldSchema = z.enum([
  "createdAt",
  "priority",
  "status",
  "category",
  "subject",
  "senderName",
  "senderEmail",
  "id",
]);

export const ticketSortOrderSchema = z.enum(["asc", "desc"]);

export const ticketQuerySchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: ticketCategorySchema,
  priority: z.nativeEnum(TicketPriority).optional(),
  search: z.string().optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
  sortBy: ticketSortFieldSchema.optional(),
  sortOrder: ticketSortOrderSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;

export const assignTicketSchema = z.object({
  assignedToId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((val) => (!val || val.trim() === "" ? null : val.trim())),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const updateTicketSchema = z
  .object({
    status: z.nativeEnum(TicketStatus).optional(),
    category: ticketCategorySchema,
    priority: z.nativeEnum(TicketPriority).optional(),
    assignedToId: z
      .union([z.string(), z.null()])
      .optional()
      .transform((val) =>
        val === undefined
          ? undefined
          : !val || val.trim() === ""
          ? null
          : val.trim()
      ),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.category !== undefined ||
      data.priority !== undefined ||
      data.assignedToId !== undefined,
    {
      message: "At least one field to update must be provided",
    }
  );

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const createReplySchema = z.object({
  body: z
    .string({ required_error: "Reply message is required" })
    .trim()
    .min(1, "Reply message cannot be empty")
    .max(10000, "Reply message cannot exceed 10,000 characters"),
  status: z.nativeEnum(TicketStatus).optional(),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

export const polishReplySchema = z
  .object({
    text: z.string().optional(),
    body: z.string().optional(),
    draft: z.string().optional(),
    agentName: z.string().optional(),
    customerName: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.text && data.text.trim().length > 0) ||
        (data.body && data.body.trim().length > 0) ||
        (data.draft && data.draft.trim().length > 0)
      ),
    {
      message: "Reply text to polish cannot be empty",
    }
  );

export type PolishReplyInput = z.infer<typeof polishReplySchema>;



