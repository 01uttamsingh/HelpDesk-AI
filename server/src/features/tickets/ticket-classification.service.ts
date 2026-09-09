import prisma from "../../prisma";
import { TicketCategory, TicketPriority, type Ticket } from "@prisma/client";
import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "../../config/env";
import { TicketServiceError } from "./ticket.service";
import { z } from "zod";

export const ticketClassificationOutputSchema = z.object({
  category: z.enum([
    TicketCategory.GENERAL_QUESTION,
    TicketCategory.TECHNICAL_QUESTION,
    TicketCategory.REFUND_REQUEST,
  ]),
  priority: z.enum([
    TicketPriority.LOW,
    TicketPriority.MEDIUM,
    TicketPriority.HIGH,
  ]),
  reasoning: z.string(),
});

export type TicketClassificationOutput = z.infer<typeof ticketClassificationOutputSchema>;

export interface TicketClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
  reasoning: string;
}

export const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert customer support AI classifier for an online educational tech platform.
Your job is to analyze incoming student support emails and accurately classify their category and priority.

Categories:
1. GENERAL_QUESTION:
   - Inquiries about course curriculum, prerequisites, certificates, syllabus, enrollment, account access, login help, general platform navigation, or general advice.
2. TECHNICAL_QUESTION:
   - Inquiries regarding coding bugs, compiler/build errors, video playback issues, audio/video player glitches, environment setup, software version incompatibilities, or course coding exercises.
3. REFUND_REQUEST:
   - Inquiries regarding billing, duplicate charges, payment failures, subscription cancellation, money-back guarantee, invoice requests, or asking for a refund.

Priorities:
1. HIGH:
   - Urgent issues: refund requests, payment/billing errors, complete blockers where the student cannot access paid content at all, angry or highly frustrated sentiment, or time-sensitive deadlines.
2. MEDIUM:
   - Standard questions: technical issues that have workarounds, coding questions, general support inquiries, course navigation questions.
3. LOW:
   - Minor inquiries: general feedback, non-blocking cosmetic questions, compliments, or curiosity inquiries with no urgency.

Instructions:
- Analyze both the subject and the body of the ticket.
- Provide a brief 1-2 sentence reasoning explaining your classification decision.
- Strictly output the structured JSON object matching the requested schema.`;

export class TicketClassificationService {
  /**
   * Classify a ticket using GPT via Vercel AI SDK and update its category & priority in the database.
   */
  async classifyTicket(
    ticketId: number
  ): Promise<{ ticket: Ticket; classification: TicketClassificationResult }> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new TicketServiceError("Ticket not found", 404);
    }

    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new TicketServiceError(
        "OpenAI API key is missing. Please ensure OPENAI_API_KEY is configured in your .env file.",
        400
      );
    }

    try {
      const openaiProvider = createOpenAI({ apiKey });
      const { output } = await generateText({
        model: openaiProvider("gpt-5.6-luna"),
        output: Output.object({
          schema: ticketClassificationOutputSchema,
        }),
        system: CLASSIFICATION_SYSTEM_PROMPT,
        prompt: `Ticket #${ticket.id}\nCustomer: ${ticket.senderName} (${ticket.senderEmail})\nSubject: ${ticket.subject}\n\nMessage Body:\n${ticket.body}`,
      });

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          category: output.category,
          priority: output.priority,
        },
      });

      return {
        ticket: updatedTicket,
        classification: output,
      };
    } catch (error: any) {
      if (error instanceof TicketServiceError) throw error;
      console.error(`AI SDK error while classifying ticket #${ticketId}:`, error);
      throw new TicketServiceError(
        error?.message ? `AI Classification failed: ${error.message}` : "Failed to classify ticket with AI",
        502
      );
    }
  }

  /**
   * Non-blocking trigger: asynchronously enqueues ticket classification via pg-boss.
   * Catches and logs all errors so it never throws an unhandled rejection.
   */
  async classifyTicketAsync(ticketId: number): Promise<string | null> {
    try {
      const { enqueueTicketClassification } = await import("../../queue");
      return await enqueueTicketClassification(ticketId);
    } catch (error) {
      console.error(`[AI Classification] Failed to enqueue classification for ticket #${ticketId}:`, error);
      return null;
    }
  }
}

export const ticketClassificationService = new TicketClassificationService();
