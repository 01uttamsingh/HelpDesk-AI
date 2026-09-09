import { describe, it, expect, mock, beforeAll, afterAll } from "bun:test";
import prisma from "../prisma";
import { TicketCategory, TicketStatus } from "@prisma/client";

mock.module("ai", () => ({
  generateText: mock(async () => ({
    output: {
      category: "TECHNICAL_QUESTION",
      priority: "MEDIUM",
      reasoning: "Queue worker test classification.",
    },
  })),
  Output: {
    object: (opts: any) => opts,
  },
}));

const {
  startQueue,
  stopQueue,
  clearQueue,
  enqueueTicketClassification,
  TICKET_CLASSIFICATION_QUEUE,
  getQueue,
} = await import("../queue");

describe("pg-boss Queue Infrastructure", () => {
  beforeAll(async () => {
    await startQueue();
    await clearQueue();
  });

  afterAll(async () => {
    await clearQueue();
    await stopQueue({ graceful: true, timeout: 5000 });
  });

  it("exposes the correct queue name constant", () => {
    expect(TICKET_CLASSIFICATION_QUEUE).toBe("ticket-classification");
  });

  it("returns singleton PgBoss instance from getQueue", () => {
    const queue1 = getQueue();
    const queue2 = getQueue();
    expect(queue1).toBe(queue2);
  });

  it("enqueues a ticket classification job and worker processes it via LISTEN/NOTIFY", async () => {
    const ticket = await prisma.ticket.create({
      data: {
        subject: "pg-boss worker queue test",
        body: "Testing queue worker end-to-end",
        senderName: "Queue Tester",
        senderEmail: "queue.tester@example.com",
        status: TicketStatus.OPEN,
        category: null,
      },
    });

    try {
      const jobId = await enqueueTicketClassification(ticket.id);

      expect(jobId).not.toBeNull();
      expect(typeof jobId).toBe("string");
      expect(jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Wait for the LISTEN/NOTIFY worker to process the job
      let updatedTicket = null;
      for (let i = 0; i < 40; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        updatedTicket = await prisma.ticket.findUnique({
          where: { id: ticket.id },
        });
        if (updatedTicket?.category) break;
      }

      expect(updatedTicket?.category).toBe(TicketCategory.TECHNICAL_QUESTION);
    } finally {
      await prisma.ticket.delete({ where: { id: ticket.id } });
    }
  });
});
