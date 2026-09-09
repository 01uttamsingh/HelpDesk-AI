import fs from "fs";
import path from "path";
import prisma from "../../prisma";
import { TicketCategory, TicketPriority, TicketStatus, ReplySenderType, type Ticket, type TicketReply } from "@prisma/client";
import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "../../config/env";
import { TicketServiceError } from "./ticket.service";
import {
  extractFirstName,
  deriveNameFromEmail,
  formatReplyText,
} from "./ticket.utils";
import { z } from "zod";

export const HELPDESK_SUPPORT_TEAM = "HelpDesk Support Team";

export const ticketAutoResolveOutputSchema = z.object({
  canAutoResolve: z
    .boolean()
    .describe(
      "True if the ticket can be safely, definitively, and accurately resolved using the Knowledge Base without human intervention. False if it requires human escalation, involves disputes/legal action, out-of-policy refunds, account security, or is not covered in the KB."
    ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score from 0.0 to 1.0 in the auto-resolution answer"),
  category: z
    .nativeEnum(TicketCategory)
    .describe("Predicted category: GENERAL_QUESTION, TECHNICAL_QUESTION, or REFUND_REQUEST"),
  priority: z
    .nativeEnum(TicketPriority)
    .describe("Urgency priority: LOW, MEDIUM, or HIGH"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this ticket can or cannot be auto-resolved"),
  reply: z
    .string()
    .describe(
      "The complete, professional, customer-friendly email reply addressing the customer by their first name, properly formatted, and signed off with HelpDesk Support Team. Empty string if canAutoResolve is false."
    ),
});

export type TicketAutoResolveOutput = z.infer<typeof ticketAutoResolveOutputSchema>;

export interface AutoResolveResult {
  ticket: Ticket;
  resolved: boolean;
  reply?: TicketReply;
  reasoning: string;
  category: TicketCategory;
  priority: TicketPriority;
}

let cachedKnowledgeBase: string | null = null;

/**
 * Loads the official knowledge base from `server/knowledge-base.md`.
 * Caches the markdown in memory for rapid repeated access.
 */
export function loadKnowledgeBase(): string {
  if (cachedKnowledgeBase) {
    return cachedKnowledgeBase;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), "knowledge-base.md"),
    path.resolve(process.cwd(), "server/knowledge-base.md"),
    path.resolve(import.meta.dirname, "../../../knowledge-base.md"),
    path.resolve(import.meta.dirname, "../../../../server/knowledge-base.md"),
    path.resolve(import.meta.dirname, "../../knowledge-base.md"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      cachedKnowledgeBase = fs.readFileSync(p, "utf-8");
      return cachedKnowledgeBase;
    }
  }

  throw new TicketServiceError(
    `Knowledge base file could not be found in candidate paths: ${candidatePaths.join(", ")}`,
    500
  );
}

/**
 * Resets the cached knowledge base (useful for unit testing).
 */
export function resetKnowledgeBaseCache(): void {
  cachedKnowledgeBase = null;
}

export function buildAutoResolveSystemPrompt(knowledgeBaseContent: string): string {
  return `You are an expert customer support specialist for the HelpDesk Support Team.
Your job is to analyze incoming student support tickets upon arrival and determine whether the ticket can be definitively, accurately, and safely auto-resolved using ONLY the official Knowledge Base provided below.

=== OFFICIAL KNOWLEDGE BASE ===
${knowledgeBaseContent}
=== END KNOWLEDGE BASE ===

=== CRITICAL GROUNDING & ESCALATION RULES ===
1. Knowledge Base Grounding:
   - Ground your answer strictly in the official Knowledge Base.
   - Do NOT fabricate policies, courses, video download options, or refund commitments.
   - If the student's inquiry is not covered in the Knowledge Base (e.g., custom code debugging, topics outside the KB), set "canAutoResolve": false.

2. Escalation Rules (Internal Policy - Section 10):
   - You MUST NOT auto-resolve (set "canAutoResolve": false) if ANY of these conditions are met:
     a) The user threatens legal action.
     b) The user requests a refund outside the 30-day window.
     c) The user disputes a charge or mentions a credit card chargeback.
     d) The issue involves account security concerns (e.g. account takeover, unauthorized access, compromised account).
     e) Your confidence score is low (< 0.75).
   - If the user requests an actual refund processing (not just asking for the policy), do not auto-resolve; route/escalate to human.

3. Classification:
   - Category: GENERAL_QUESTION, TECHNICAL_QUESTION, or REFUND_REQUEST.
   - Priority: LOW, MEDIUM, or HIGH (urgent/disputes/security are HIGH).

4. Autonomous Reply Generation, Tone & Formatting:
   - If "canAutoResolve" is true, write a complete, helpful, professional, and customer-friendly reply:
     - Customer Greeting: Always address the customer directly by their first name: "Dear <cust_first_name>," (e.g. "Dear John,"). If the customer's first name is unknown, use "Dear Customer,".
     - Professional & Customer-Friendly Tone:
       * Write in an empathetic, polite, welcoming, courteous, and reassuring tone.
       * Acknowledge the student's question with care and provide helpful, solution-oriented guidance.
       * Use positive, clear, and constructive language throughout.
     - Proper Formatting:
       * Organize your response with clean paragraph breaks (separated by blank lines).
       * Present step-by-step instructions or troubleshooting procedures as clear numbered lists (1., 2., 3.) or clean bullet points.
       * Keep instructions easy to read and understand. Do not include raw markdown headers (###) or code block fences unless displaying actual code.
     - Sign-off: Conclude the email warmly and sign off with "HelpDesk Support Team", formatted exactly as:
       Best regards,
       HelpDesk Support Team
   - If "canAutoResolve" is false, return an empty string for "reply".

5. Structured JSON Output:
   - Strictly return JSON matching the requested schema.`;
}

export class TicketAutoResolveService {
  /**
   * Attempts to auto-resolve a ticket upon arrival using the official knowledge base.
   * State machine:
   * 1. Ticket starts as NEW.
   * 2. Moves to PROCESSING when AI is trying to resolve it.
   * 3. Either becomes RESOLVED (with AI reply) or OPEN (for human agent review).
   */
  async autoResolveTicket(ticketId: number): Promise<AutoResolveResult> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { replies: true },
    });

    if (!ticket) {
      throw new TicketServiceError("Ticket not found", 404);
    }

    // Skip auto-resolution if the ticket is already resolved or closed
    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
      return {
        ticket,
        resolved: ticket.status === TicketStatus.RESOLVED,
        reasoning: "Ticket is already resolved or closed",
        category: ticket.category || TicketCategory.GENERAL_QUESTION,
        priority: ticket.priority,
      };
    }

    // Move ticket to PROCESSING state while AI is trying to resolve it
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.PROCESSING },
    });

    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // If API key is missing, fallback to OPEN so the ticket is visible to human agents
      const fallbackTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.OPEN },
      });
      throw new TicketServiceError(
        "OpenAI API key is missing. Please ensure OPENAI_API_KEY is configured in your .env file.",
        400
      );
    }

    const kbContent = loadKnowledgeBase();
    const systemPrompt = buildAutoResolveSystemPrompt(kbContent);

    const customerFirstName =
      extractFirstName(ticket.senderName) ||
      extractFirstName(deriveNameFromEmail(ticket.senderEmail)) ||
      "Customer";

    const userPrompt = `Ticket #${ticket.id}
Customer Name: ${ticket.senderName}
Customer First Name: ${customerFirstName}
Customer Email: ${ticket.senderEmail}
Subject: ${ticket.subject}

Customer Message:
${ticket.body}`;

    try {
      const openaiProvider = createOpenAI({ apiKey });
      const { output } = await generateText({
        model: openaiProvider("gpt-5.6-luna"),
        output: Output.object({
          schema: ticketAutoResolveOutputSchema,
        }),
        system: systemPrompt,
        prompt: userPrompt,
      });

      const shouldAutoResolve =
        output.canAutoResolve &&
        output.confidence >= 0.75 &&
        output.reply.trim().length > 0;

      if (shouldAutoResolve) {
        // Format greeting, tone, sign-off, and proper layout
        const finalReply = formatReplyText(output.reply, {
          customerFirstName,
          signOffName: HELPDESK_SUPPORT_TEAM,
        });

        // Transition from PROCESSING -> RESOLVED with AI reply
        const [createdReply, updatedTicket] = await prisma.$transaction([
          prisma.ticketReply.create({
            data: {
              ticketId: ticket.id,
              userId: null,
              senderType: ReplySenderType.AI,
              body: finalReply,
            },
          }),
          prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: TicketStatus.RESOLVED,
              category: ticket.category ?? output.category,
              priority: output.priority,
              updatedAt: new Date(),
            },
          }),
        ]);

        return {
          ticket: updatedTicket,
          resolved: true,
          reply: createdReply,
          reasoning: output.reasoning,
          category: output.category,
          priority: output.priority,
        };
      } else {
        // Transition from PROCESSING -> OPEN (ready for human agents)
        const updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: TicketStatus.OPEN,
            category: ticket.category ?? output.category,
            priority: output.priority,
            updatedAt: new Date(),
          },
        });

        return {
          ticket: updatedTicket,
          resolved: false,
          reasoning: output.reasoning,
          category: output.category,
          priority: output.priority,
        };
      }
    } catch (error: any) {
      // In case of AI error, transition to OPEN so the ticket is never stuck in PROCESSING
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.OPEN },
      }).catch(() => null);

      if (error instanceof TicketServiceError) throw error;
      console.error(`AI SDK error during auto-resolve for ticket #${ticketId}:`, error);
      throw new TicketServiceError(
        error?.message ? `AI Auto-Resolve failed: ${error.message}` : "Failed to auto-resolve ticket with AI",
        502
      );
    }
  }

  /**
   * Asynchronously triggers auto-resolution in the background via pg-boss.
   * Catches and logs all errors, ensuring zero unhandled promise rejections.
   */
  async autoResolveTicketAsync(ticketId: number): Promise<string | null> {
    try {
      const { enqueueTicketAutoResolve } = await import("../../queue");
      return await enqueueTicketAutoResolve(ticketId);
    } catch (error) {
      console.error(`[AI Auto-Resolve] Failed to enqueue auto-resolve job for ticket #${ticketId}:`, error);
      // Fallback: ensure ticket is marked OPEN so it's visible to agents
      prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.OPEN },
      }).catch(() => null);
      return null;
    }
  }
}

export const ticketAutoResolveService = new TicketAutoResolveService();
