import { describe, it, expect, mock, beforeEach } from "bun:test";
import prisma from "../../../prisma";
import { TicketStatus, Role } from "@prisma/client";
import { getOrCreateAiAgent, AI_AGENT_EMAIL, AI_AGENT_NAME } from "../ai-agent.utils";
import { ticketIngestService } from "../ticket-ingest.service";

let mockGenerateText = mock(async () => ({
  output: {
    canAutoResolve: true,
    confidence: 0.95,
    category: "GENERAL_QUESTION",
    priority: "LOW",
    reasoning: "Password reset assistance.",
    reply: "To reset your password, visit the login page and click Forgot Password.",
  },
}));

mock.module("ai", () => ({
  generateText: (options: any) => mockGenerateText(options),
  Output: {
    object: (opts: any) => opts,
  },
}));

const { ticketAutoResolveService } = await import("../ticket-auto-resolve.service");

describe("AI Agent Ticket Assignment Lifecycle", () => {
  beforeEach(() => {
    mockGenerateText = mock(async () => ({
      output: {
        canAutoResolve: true,
        confidence: 0.95,
        category: "GENERAL_QUESTION",
        priority: "LOW",
        reasoning: "General question resolution.",
        reply: "Here are the instructions to resolve your issue.",
      },
    }));
  });

  it("getOrCreateAiAgent finds or provisions the official AI agent user", async () => {
    const aiAgent = await getOrCreateAiAgent();
    expect(aiAgent).toBeDefined();
    expect(aiAgent.name).toBe(AI_AGENT_NAME);
    expect(aiAgent.email).toBe(AI_AGENT_EMAIL);
    expect(aiAgent.role).toBe(Role.AGENT);
  });

  it("assigns newly arrived inbound tickets to the AI agent on arrival (status: NEW)", async () => {
    const aiAgent = await getOrCreateAiAgent();
    const uniqueEmail = `student.${Date.now()}@example.com`;

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `Test Student <${uniqueEmail}>`,
      subject: `New arrival ticket ${Date.now()}`,
      text: "I need help with my account.",
    });

    expect(ticket.status).toBe(TicketStatus.NEW);
    expect(ticket.assignedToId).toBe(aiAgent.id);

    // Verify stored in DB
    const inDb = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(inDb?.assignedToId).toBe(aiAgent.id);
  });

  it("keeps ticket assigned to AI agent when auto-resolution succeeds (status: RESOLVED)", async () => {
    const aiAgent = await getOrCreateAiAgent();
    const uniqueEmail = `student.resolved.${Date.now()}@example.com`;

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `Jane Doe <${uniqueEmail}>`,
      subject: `Password reset query ${Date.now()}`,
      text: "How do I reset my password?",
    });

    expect(ticket.assignedToId).toBe(aiAgent.id);

    const result = await ticketAutoResolveService.autoResolveTicket(ticket.id);
    expect(result.resolved).toBe(true);
    expect(result.ticket.status).toBe(TicketStatus.RESOLVED);
    expect(result.ticket.assignedToId).toBe(aiAgent.id);

    const inDb = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(inDb?.status).toBe(TicketStatus.RESOLVED);
    expect(inDb?.assignedToId).toBe(aiAgent.id);
  });

  it("unassigns ticket from AI agent (assignedToId: null) when auto-resolution fails (status: OPEN)", async () => {
    const aiAgent = await getOrCreateAiAgent();
    const uniqueEmail = `student.unassign.${Date.now()}@example.com`;

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `Disputed Customer <${uniqueEmail}>`,
      subject: `Chargeback dispute ${Date.now()}`,
      text: "I want a refund after 6 months or I am charging back!",
    });

    expect(ticket.assignedToId).toBe(aiAgent.id);

    // Mock AI refusing auto-resolution
    mockGenerateText = mock(async () => ({
      output: {
        canAutoResolve: false,
        confidence: 0.99,
        category: "REFUND_REQUEST",
        priority: "HIGH",
        reasoning: "Section 10 Escalation: dispute requires human review.",
        reply: "",
      },
    }));

    const result = await ticketAutoResolveService.autoResolveTicket(ticket.id);
    expect(result.resolved).toBe(false);
    expect(result.ticket.status).toBe(TicketStatus.OPEN);
    expect(result.ticket.assignedToId).toBeNull();

    const inDb = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(inDb?.status).toBe(TicketStatus.OPEN);
    expect(inDb?.assignedToId).toBeNull();
  });

  it("unassigns ticket from AI agent when a customer sends a follow-up reply", async () => {
    const aiAgent = await getOrCreateAiAgent();
    const uniqueEmail = `followup.${Date.now()}@example.com`;
    const subject = `Billing inquiry ${Date.now()}`;

    // 1. Ingest initial ticket
    const initialTicket = await ticketIngestService.ingestInboundEmail({
      from: `Followup Student <${uniqueEmail}>`,
      subject,
      text: "Initial question",
    });

    // 2. AI resolves ticket
    await ticketAutoResolveService.autoResolveTicket(initialTicket.id);

    const resolvedTicket = await prisma.ticket.findUnique({ where: { id: initialTicket.id } });
    expect(resolvedTicket?.status).toBe(TicketStatus.RESOLVED);
    expect(resolvedTicket?.assignedToId).toBe(aiAgent.id);

    // 3. Customer replies back
    const replyTicket = await ticketIngestService.ingestInboundEmail({
      from: `Followup Student <${uniqueEmail}>`,
      subject: `Re: ${subject}`,
      text: "Thanks, but that did not work.",
    });

    expect(replyTicket.isReply).toBe(true);
    expect(replyTicket.status).toBe(TicketStatus.OPEN);
    expect(replyTicket.assignedToId).toBeNull();

    const inDb = await prisma.ticket.findUnique({ where: { id: initialTicket.id } });
    expect(inDb?.status).toBe(TicketStatus.OPEN);
    expect(inDb?.assignedToId).toBeNull();
  });

  it("unassigns ticket from AI agent when AI generation encounters an error", async () => {
    const aiAgent = await getOrCreateAiAgent();
    const uniqueEmail = `error.test.${Date.now()}@example.com`;

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `Error Customer <${uniqueEmail}>`,
      subject: `Error test ticket ${Date.now()}`,
      text: "Help please.",
    });

    expect(ticket.assignedToId).toBe(aiAgent.id);

    mockGenerateText = mock(async () => {
      throw new Error("Temporary AI service outage");
    });

    await expect(ticketAutoResolveService.autoResolveTicket(ticket.id)).rejects.toThrow();

    const inDb = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(inDb?.status).toBe(TicketStatus.OPEN);
    expect(inDb?.assignedToId).toBeNull();
  });
});
