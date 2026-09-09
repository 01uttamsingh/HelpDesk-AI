import prisma from "../../prisma";
import { TicketStatus, ReplySenderType, type Ticket, type Prisma } from "@prisma/client";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { env } from "../../config/env";
import {
  cleanSummaryText,
  ensureAgentSignOff,
  extractFirstName,
  ensureCustomerGreeting,
  formatReplyText,
} from "./ticket.utils";
import type {
  TicketFilterQuery,
  TicketCounts,
  PaginatedTicketsResult,
  TicketReplyItem,
  TicketWithDetails,
} from "./ticket.types";
import type { UpdateTicketInput } from "./ticket.schema";

export class TicketServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "TicketServiceError";
    this.statusCode = statusCode;
  }
}

export class TicketService {
  /**
   * Fetch a single ticket by its auto-increment integer ID with replies and assignedTo.
   */
  async getTicketById(id: number): Promise<TicketWithDetails | null> {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Fetch paginated tickets sorted by newest first (createdAt: "desc") by default,
   * with optional filtering by status, category, priority, search text, or sort order.
   */
  async getAllTickets(query?: TicketFilterQuery): Promise<PaginatedTicketsResult> {
    const where: Prisma.TicketWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    } else {
      // By default, do not show tickets being resolved by AI on the ticket lists (NEW and PROCESSING)
      where.status = { notIn: [TicketStatus.NEW, TicketStatus.PROCESSING] };
    }

    if (query?.category !== undefined) {
      where.category = query.category;
    }

    if (query?.priority) {
      where.priority = query.priority;
    }

    if (query?.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { senderName: { contains: q, mode: "insensitive" } },
        { senderEmail: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
      ];
    }

    let orderBy: Prisma.TicketOrderByWithRelationInput[];

    if (query?.sortBy) {
      const order: Prisma.SortOrder = query.sortOrder === "asc" ? "asc" : "desc";
      orderBy = [
        { [query.sortBy]: order },
        ...(query.sortBy !== "id" ? [{ id: "desc" as Prisma.SortOrder }] : []),
      ];
    } else if (query?.sort === "oldest") {
      orderBy = [{ createdAt: "asc" }, { id: "asc" }];
    } else {
      // Default: newest first
      orderBy = [{ createdAt: "desc" }, { id: "desc" }];
    }

    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 10;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      tickets,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  }

  /**
   * Retrieve total counts of tickets broken down by status, excluding tickets being resolved by AI (NEW and PROCESSING).
   */
  async getTicketCounts(): Promise<TicketCounts> {
    const [total, open, resolved, closed] = await Promise.all([
      prisma.ticket.count({
        where: { status: { notIn: [TicketStatus.NEW, TicketStatus.PROCESSING] } },
      }),
      prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
      prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
    ]);

    return { total, open, resolved, closed };
  }

  /**
   * Assign or reassign a ticket to a user, or unassign if assignedToId is null.
   * Validates that the ticket exists, and if assignedToId is provided, validates that the user exists and is not soft-deleted.
   */
  async assignTicket(ticketId: number, assignedToId: string | null): Promise<TicketWithDetails> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new TicketServiceError("Ticket not found", 404);
    }

    if (assignedToId !== null) {
      const user = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, deletedAt: true, role: true },
      });

      if (!user || user.deletedAt) {
        throw new TicketServiceError("Assigned user not found or deactivated", 400);
      }
    }

    return prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Retrieve all active users who can be assigned to tickets (Admins & Agents).
   * Filters out soft-deleted users (deletedAt: null).
   */
  async getAssignableUsers(): Promise<
    Array<{ id: string; name: string; email: string; role: string }>
  > {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [{ name: "asc" }],
    });
  }

  /**
   * Partially updates a ticket's fields (status, category, priority, assignedToId).
   * Validates ticket existence and ensures assigned users exist and are active.
   */
  async updateTicket(ticketId: number, input: UpdateTicketInput): Promise<TicketWithDetails> {
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!existingTicket) {
      throw new TicketServiceError("Ticket not found", 404);
    }

    if (input.assignedToId !== undefined && input.assignedToId !== null) {
      const user = await prisma.user.findUnique({
        where: { id: input.assignedToId },
        select: { id: true, deletedAt: true, role: true },
      });

      if (!user || user.deletedAt) {
        throw new TicketServiceError("Assigned user not found or deactivated", 400);
      }
    }

    const dataToUpdate: Prisma.TicketUncheckedUpdateInput = {};
    if (input.status !== undefined) dataToUpdate.status = input.status;
    if (input.category !== undefined) dataToUpdate.category = input.category;
    if (input.priority !== undefined) dataToUpdate.priority = input.priority;
    if (input.assignedToId !== undefined) dataToUpdate.assignedToId = input.assignedToId;

    return prisma.ticket.update({
      where: { id: ticketId },
      data: dataToUpdate,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create a new reply for a ticket.
   * Handles AGENT replies (with active user validation) and CUSTOMER replies.
   * Updates ticket's updatedAt and optional status.
   */
  async createReply(
    ticketId: number,
    userId: string | null,
    body: string,
    options?: {
      senderType?: ReplySenderType;
      status?: TicketStatus;
    }
  ): Promise<TicketReplyItem> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new TicketServiceError("Ticket not found", 404);
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new TicketServiceError("Cannot add replies to a closed ticket", 400);
    }

    const senderType: ReplySenderType =
      options?.senderType ?? (userId ? "AGENT" : "CUSTOMER");

    if (senderType === "AGENT" && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, deletedAt: true, role: true },
      });

      if (!user || user.deletedAt) {
        throw new TicketServiceError("User not found or deactivated", 400);
      }
    }

    const [reply] = await prisma.$transaction([
      prisma.ticketReply.create({
        data: {
          ticketId,
          userId: senderType === "AGENT" ? userId : null,
          senderType,
          body,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: {
          updatedAt: new Date(),
          ...(options?.status ? { status: options.status } : {}),
        },
      }),
    ]);

    return reply;
  }

  /**
   * Retrieve all replies for a ticket ordered chronologically.
   */
  async getRepliesByTicketId(ticketId: number): Promise<TicketReplyItem[]> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new TicketServiceError("Ticket not found", 404);
    }

    return prisma.ticketReply.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Polish and improve an agent's draft reply using GPT-5.6 Luna via the Vercel AI SDK.
   * Includes customer first name greeting ("Dear <cust_first_name>,") and agent sign-off ("Regards,\n<agent_name>").
   */
  async polishReply(
    ticketId: number | null,
    draftReply: string,
    agentName?: string,
    customerName?: string
  ): Promise<string> {
    const trimmedDraft = draftReply?.trim();
    if (!trimmedDraft) {
      throw new TicketServiceError("Draft reply text is required", 400);
    }

    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new TicketServiceError(
        "OpenAI API key is missing. Please ensure OPENAI_API_KEY is configured in your .env file.",
        400
      );
    }

    let resolvedCustomerName = customerName?.trim() || "";
    let ticketContext = "";
    if (ticketId !== null) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { subject: true, body: true, senderName: true },
      });
      if (ticket) {
        if (!resolvedCustomerName && ticket.senderName) {
          resolvedCustomerName = ticket.senderName.trim();
        }
        ticketContext = `Customer Ticket Subject: ${ticket.subject}\nCustomer Issue Description: ${ticket.body}\n\n`;
      }
    }

    const customerFirstName = extractFirstName(resolvedCustomerName);
    const cleanAgentName = agentName?.trim();

    const greetingRule = customerFirstName
      ? `\n5. Customer Greeting: Begin the reply with a polite greeting addressing the customer by their first name, formatted exactly as:\nDear ${customerFirstName},`
      : "";

    const signOffRule = cleanAgentName
      ? `\n6. Sign-off: Conclude the reply with a professional sign-off including the agent's name, formatted exactly as:\nRegards,\n${cleanAgentName}`
      : "";

    const systemPrompt = `You are an expert customer support specialist for the HelpDesk Support Team.
Your task is to polish, refine, format, and improve the draft reply to a customer.
Follow these guidelines:
1. Professional & Customer-Friendly Tone: Ensure the reply is empathetic, polite, welcoming, professional, reassuring, and clear.
2. Clarity, Flow & Proper Formatting: Fix any grammatical errors, improve phrasing, format clean paragraphs with blank lines between them, and present step-by-step instructions or troubleshooting procedures with clear numbered lists (1., 2., 3.) or bullet points.
3. Preserve Intent: Keep all factual information, steps, technical instructions, decisions, and links from the draft. Do NOT invent new commitments or promises.
4. Output Format: Return ONLY the polished reply text directly. Do not include introductory notes, commentary, quotation marks, or markdown wrappers.${greetingRule}${signOffRule}`;

    const customerContext = customerFirstName ? `Customer First Name: ${customerFirstName}\n` : "";
    const agentContext = cleanAgentName ? `Agent Name: ${cleanAgentName}\n` : "";
    const prompt = `${ticketContext}${customerContext}${agentContext}Agent's Draft Reply:\n${trimmedDraft}`;

    try {
      const openaiProvider = createOpenAI({ apiKey });
      const { text } = await generateText({
        model: openaiProvider("gpt-5.6-luna"),
        system: systemPrompt,
        prompt,
      });

      const polished = formatReplyText(text, {
        customerFirstName,
        signOffName: cleanAgentName,
      });
      return polished;
    } catch (error: any) {
      console.error("AI SDK error while polishing reply:", error);
      throw new TicketServiceError(
        error?.message ? `AI Polish failed: ${error.message}` : "Failed to polish reply with AI",
        502
      );
    }
  }

  /**
   * Summarize a ticket and its entire conversation history using GPT-5.6 Luna via Vercel AI SDK.
   */
  async summarizeTicket(ticketId: number): Promise<string> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
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

    let conversationText = "";
    if (ticket.replies && ticket.replies.length > 0) {
      conversationText = ticket.replies
        .map((reply, index) => {
          const author =
            reply.senderType === "CUSTOMER"
              ? `Customer (${ticket.senderName})`
              : reply.senderType === "AI"
              ? "AI Assistant"
              : `Agent (${reply.user?.name || "Support Agent"})`;
          return `[Reply #${index + 1} by ${author} at ${reply.createdAt.toISOString()}]:\n${reply.body}`;
        })
        .join("\n\n");
    } else {
      conversationText = "(No replies in conversation yet.)";
    }

    const systemPrompt = `You are an expert customer support specialist.
Your task is to provide a brief, concise summary of the support ticket and its conversation history in 2 to 3 sentences (maximum 60 words total).

Instructions:
- Directly summarize: 1) What the customer needs, 2) The key response or progress so far, and 3) Current status or next step.
- Keep it concise, direct, and easy to scan in 10 seconds.
- Do NOT use markdown headers (no '#', '##', '###').
- Do NOT use bolding or asterisks (no '**' or '*').
- Do NOT use bullet points or lists (no '-' or '•').
- Return plain text only without introductory words like "Here is a summary:".`;

    const prompt = `Ticket Details:
- Ticket ID: #${ticket.id}
- Subject: ${ticket.subject}
- Customer: ${ticket.senderName} (${ticket.senderEmail})
- Priority: ${ticket.priority}
- Status: ${ticket.status}

Initial Customer Message:
${ticket.body}

Conversation History (${ticket.replies.length} replies):
${conversationText}

Provide a concise 2-3 sentence summary in plain text.`;

    try {
      const openaiProvider = createOpenAI({ apiKey });
      const { text } = await generateText({
        model: openaiProvider("gpt-5.6-luna"),
        system: systemPrompt,
        prompt,
      });

      return cleanSummaryText(text.trim());
    } catch (error: any) {
      console.error("AI SDK error while summarizing ticket:", error);
      throw new TicketServiceError(
        error?.message ? `AI Summary failed: ${error.message}` : "Failed to summarize ticket with AI",
        502
      );
    }
  }
}

export const ticketService = new TicketService();

