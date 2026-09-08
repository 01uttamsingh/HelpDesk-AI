import { describe, it, expect, beforeEach } from "bun:test";
import { ticketService } from "../ticket.service";
import { ticketIngestService } from "../ticket-ingest.service";
import { TicketCategory, TicketStatus, TicketPriority } from "@prisma/client";
import prisma from "../../../prisma";

describe("ticketService.getAllTickets", () => {
  it("sorts tickets by newest first by default", async () => {
    const timestamp = Date.now();
    const t1 = await ticketIngestService.ingestInboundEmail({
      from: `user1.${timestamp}@example.com`,
      subject: `Old Ticket ${timestamp}`,
      text: "Oldest body",
    });

    // Small delay to guarantee different createdAt
    await new Promise((res) => setTimeout(res, 20));

    const t2 = await ticketIngestService.ingestInboundEmail({
      from: `user2.${timestamp}@example.com`,
      subject: `New Ticket ${timestamp}`,
      text: "Newest body",
    });

    const { tickets } = await ticketService.getAllTickets();
    expect(tickets.length).toBeGreaterThanOrEqual(2);

    const index1 = tickets.findIndex((t) => t.id === t1.id);
    const index2 = tickets.findIndex((t) => t.id === t2.id);

    expect(index2).toBeLessThan(index1); // Newest ticket appears before older ticket
  });

  it("filters tickets by category", async () => {
    const timestamp = Date.now();
    await ticketIngestService.ingestInboundEmail({
      from: `tech.${timestamp}@example.com`,
      subject: `Technical issue ${timestamp}`,
      text: "App crashes",
      category: TicketCategory.TECHNICAL_QUESTION,
    });

    await ticketIngestService.ingestInboundEmail({
      from: `refund.${timestamp}@example.com`,
      subject: `Refund please ${timestamp}`,
      text: "Want my money back",
      category: TicketCategory.REFUND_REQUEST,
    });

    const { tickets: techTickets } = await ticketService.getAllTickets({
      category: TicketCategory.TECHNICAL_QUESTION,
    });

    expect(techTickets.length).toBeGreaterThan(0);
    techTickets.forEach((t) => {
      expect(t.category).toBe(TicketCategory.TECHNICAL_QUESTION);
    });
  });

  it("filters tickets by search query across subject, sender, and body", async () => {
    const timestamp = Date.now();
    const uniqueTerm = `quantum-physics-${timestamp}`;

    await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Course on ${uniqueTerm}`,
      text: "Need more details",
    });

    const { tickets: results } = await ticketService.getAllTickets({
      search: uniqueTerm,
    });

    expect(results.length).toBe(1);
    expect(results[0].subject).toContain(uniqueTerm);
  });

  it("sorts tickets by createdAt ascending when sortBy=createdAt and sortOrder=asc", async () => {
    const timestamp = Date.now();
    const t1 = await ticketIngestService.ingestInboundEmail({
      from: `user-old.${timestamp}@example.com`,
      subject: `Old Ticket Sort ${timestamp}`,
      text: "First created",
    });

    await new Promise((res) => setTimeout(res, 25));

    const t2 = await ticketIngestService.ingestInboundEmail({
      from: `user-new.${timestamp}@example.com`,
      subject: `New Ticket Sort ${timestamp}`,
      text: "Second created",
    });

    const { tickets } = await ticketService.getAllTickets({
      search: timestamp.toString(),
      sortBy: "createdAt",
      sortOrder: "asc",
    });

    const index1 = tickets.findIndex((t) => t.id === t1.id);
    const index2 = tickets.findIndex((t) => t.id === t2.id);

    expect(index1).toBeLessThan(index2);
  });

  it("sorts tickets by priority using sortBy=priority", async () => {
    const timestamp = Date.now();
    const lowTicket = await prisma.ticket.create({
      data: {
        subject: `Low Priority ${timestamp}`,
        body: "Low",
        senderName: "Low User",
        senderEmail: `low.${timestamp}@example.com`,
        priority: TicketPriority.LOW,
      },
    });

    const highTicket = await prisma.ticket.create({
      data: {
        subject: `High Priority ${timestamp}`,
        body: "High",
        senderName: "High User",
        senderEmail: `high.${timestamp}@example.com`,
        priority: TicketPriority.HIGH,
      },
    });

    // Ascending: LOW < MEDIUM < HIGH
    const { tickets: ascTickets } = await ticketService.getAllTickets({
      search: timestamp.toString(),
      sortBy: "priority",
      sortOrder: "asc",
    });
    const lowIndexAsc = ascTickets.findIndex((t) => t.id === lowTicket.id);
    const highIndexAsc = ascTickets.findIndex((t) => t.id === highTicket.id);
    expect(lowIndexAsc).toBeLessThan(highIndexAsc);

    // Descending: HIGH > MEDIUM > LOW
    const { tickets: descTickets } = await ticketService.getAllTickets({
      search: timestamp.toString(),
      sortBy: "priority",
      sortOrder: "desc",
    });
    const lowIndexDesc = descTickets.findIndex((t) => t.id === lowTicket.id);
    const highIndexDesc = descTickets.findIndex((t) => t.id === highTicket.id);
    expect(highIndexDesc).toBeLessThan(lowIndexDesc);
  });

  it("sorts tickets by subject using sortBy=subject", async () => {
    const timestamp = Date.now();
    const tA = await prisma.ticket.create({
      data: {
        subject: `AAA Ticket ${timestamp}`,
        body: "Body A",
        senderName: "Sender A",
        senderEmail: `a.${timestamp}@example.com`,
      },
    });

    const tZ = await prisma.ticket.create({
      data: {
        subject: `ZZZ Ticket ${timestamp}`,
        body: "Body Z",
        senderName: "Sender Z",
        senderEmail: `z.${timestamp}@example.com`,
      },
    });

    const { tickets: ascTickets } = await ticketService.getAllTickets({
      search: timestamp.toString(),
      sortBy: "subject",
      sortOrder: "asc",
    });
    const indexA = ascTickets.findIndex((t) => t.id === tA.id);
    const indexZ = ascTickets.findIndex((t) => t.id === tZ.id);
    expect(indexA).toBeLessThan(indexZ);
  });

  it("filters tickets by priority", async () => {
    const timestamp = Date.now();
    await prisma.ticket.create({
      data: {
        subject: `High Priority Filter ${timestamp}`,
        body: "High filter body",
        senderName: "High User",
        senderEmail: `highfilter.${timestamp}@example.com`,
        priority: TicketPriority.HIGH,
      },
    });

    const { tickets: highTickets } = await ticketService.getAllTickets({
      priority: TicketPriority.HIGH,
    });
    expect(highTickets.length).toBeGreaterThan(0);
    highTickets.forEach((t) => {
      expect(t.priority).toBe(TicketPriority.HIGH);
    });
  });

  it("filters tickets by uncategorized (category: null)", async () => {
    const timestamp = Date.now();
    const uncategorizedTicket = await prisma.ticket.create({
      data: {
        subject: `Uncategorized Filter ${timestamp}`,
        body: "Uncategorized body",
        senderName: "Uncat User",
        senderEmail: `uncat.${timestamp}@example.com`,
        category: null,
      },
    });

    const { tickets: uncatTickets } = await ticketService.getAllTickets({
      category: null,
    });
    expect(uncatTickets.length).toBeGreaterThan(0);
    const found = uncatTickets.some((t) => t.id === uncategorizedTicket.id);
    expect(found).toBe(true);
    uncatTickets.forEach((t) => {
      expect(t.category).toBeNull();
    });
  });

  it("filters tickets by status", async () => {
    const { tickets: openTickets } = await ticketService.getAllTickets({
      status: TicketStatus.OPEN,
    });
    openTickets.forEach((t) => {
      expect(t.status).toBe(TicketStatus.OPEN);
    });
  });

  it("paginates tickets accurately via page and pageSize", async () => {
    const page1 = await ticketService.getAllTickets({ page: 1, pageSize: 3 });
    expect(page1.tickets.length).toBeLessThanOrEqual(3);
    expect(page1.pagination.page).toBe(1);
    expect(page1.pagination.pageSize).toBe(3);
    expect(page1.pagination.totalCount).toBeGreaterThanOrEqual(page1.tickets.length);
    expect(page1.pagination.totalPages).toBe(Math.ceil(page1.pagination.totalCount / 3));

    if (page1.pagination.totalCount >= 4) {
      const page2 = await ticketService.getAllTickets({ page: 2, pageSize: 3 });
      expect(page2.pagination.page).toBe(2);
      expect(page2.tickets.length).toBeGreaterThan(0);

      // Verify page 1 and page 2 tickets do not overlap
      const page1Ids = new Set(page1.tickets.map((t) => t.id));
      page2.tickets.forEach((t) => {
        expect(page1Ids.has(t.id)).toBe(false);
      });
    }
  });

  it("calculates accurate ticket counts across statuses via getTicketCounts", async () => {
    const counts = await ticketService.getTicketCounts();
    expect(typeof counts.total).toBe("number");
    expect(typeof counts.open).toBe("number");
    expect(typeof counts.resolved).toBe("number");
    expect(typeof counts.closed).toBe("number");
    expect(counts.total).toBe(counts.open + counts.resolved + counts.closed);
  });
});

