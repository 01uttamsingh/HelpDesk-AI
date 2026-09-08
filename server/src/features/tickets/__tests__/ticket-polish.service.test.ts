import { describe, it, expect, mock } from "bun:test";
import { TicketServiceError } from "../ticket.service";
import prisma from "../../../prisma";

let mockGenerateText = mock(async (_options: any) => ({
  text: "Thank you for reaching out. We have resolved the issue.",
}));

mock.module("ai", () => ({
  generateText: (options: any) => mockGenerateText(options),
}));

// Import ticketService after mock.module
const { ticketService } = await import("../ticket.service");

describe("ticketService.polishReply", () => {
  it("throws a TicketServiceError when draft text is empty", async () => {
    expect(ticketService.polishReply(null, "")).rejects.toThrow(TicketServiceError);
    expect(ticketService.polishReply(null, "   ")).rejects.toThrow("Draft reply text is required");
  });

  it("calls generateText with gpt-5.6-luna model and returns polished text", async () => {
    let capturedOptions: any = null;
    mockGenerateText = mock(async (options: any) => {
      capturedOptions = options;
      return {
        text: "Thank you for reaching out. We have resolved the issue.",
      };
    });

    const result = await ticketService.polishReply(null, "fixed the issue thanks");
    expect(result).toBe("Thank you for reaching out. We have resolved the issue.");
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions.prompt).toContain("fixed the issue thanks");
    expect(capturedOptions.system).toContain("customer support");
  });

  it("includes ticket subject and body context in the prompt if ticketId exists", async () => {
    let capturedOptions: any = null;
    mockGenerateText = mock(async (options: any) => {
      capturedOptions = options;
      return {
        text: "Hello, here is the polished response.",
      };
    });

    const originalFindUnique = prisma.ticket.findUnique;
    (prisma.ticket as any).findUnique = mock(async () => ({
      subject: "Login failing on iOS",
      body: "I cannot log in with error 401",
    }));

    try {
      const result = await ticketService.polishReply(999, "try resetting your password");
      expect(result).toBe("Hello, here is the polished response.");
      expect(capturedOptions.prompt).toContain("Login failing on iOS");
      expect(capturedOptions.prompt).toContain("I cannot log in with error 401");
      expect(capturedOptions.prompt).toContain("try resetting your password");
    } finally {
      (prisma.ticket as any).findUnique = originalFindUnique;
    }
  });
});

describe("ticketService.summarizeTicket", () => {
  it("throws 404 when ticket does not exist", async () => {
    const originalFindUnique = prisma.ticket.findUnique;
    (prisma.ticket as any).findUnique = mock(async () => null);

    try {
      expect(ticketService.summarizeTicket(999)).rejects.toThrow("Ticket not found");
    } finally {
      (prisma.ticket as any).findUnique = originalFindUnique;
    }
  });

  it("summarizes ticket and full conversation history using GPT-5.6 Luna", async () => {
    let capturedOptions: any = null;
    mockGenerateText = mock(async (options: any) => {
      capturedOptions = options;
      return {
        text: "**Core Issue**: Unable to deploy app.\n**Key Discussion**: Customer reported 500 error. Agent provided fix.\n**Current Status**: Resolved.",
      };
    });

    const originalFindUnique = prisma.ticket.findUnique;
    (prisma.ticket as any).findUnique = mock(async () => ({
      id: 42,
      subject: "Deployment Error",
      body: "Getting 500 error on deploy",
      senderName: "Dev Dave",
      senderEmail: "dave@example.com",
      priority: "HIGH",
      status: "RESOLVED",
      createdAt: new Date("2026-09-08T10:00:00Z"),
      replies: [
        {
          id: 1,
          senderType: "AGENT",
          body: "Please update your build command.",
          createdAt: new Date("2026-09-08T10:15:00Z"),
          user: { id: "u-1", name: "Agent Alice", role: "AGENT" },
        },
        {
          id: 2,
          senderType: "CUSTOMER",
          body: "That solved it, thank you!",
          createdAt: new Date("2026-09-08T10:30:00Z"),
          user: null,
        },
      ],
    }));

    try {
      const summary = await ticketService.summarizeTicket(42);
      expect(summary).toContain("Core Issue: Unable to deploy app.");
      expect(capturedOptions).toBeDefined();
      expect(capturedOptions.prompt).toContain("Deployment Error");
      expect(capturedOptions.prompt).toContain("Getting 500 error on deploy");
      expect(capturedOptions.prompt).toContain("Agent (Agent Alice)");
      expect(capturedOptions.prompt).toContain("Please update your build command.");
      expect(capturedOptions.prompt).toContain("Customer (Dev Dave)");
      expect(capturedOptions.prompt).toContain("That solved it, thank you!");
    } finally {
      (prisma.ticket as any).findUnique = originalFindUnique;
    }
  });
});
