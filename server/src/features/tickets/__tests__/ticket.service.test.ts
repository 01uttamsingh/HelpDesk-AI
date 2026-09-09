import { describe, it, expect, beforeEach } from "bun:test";
import { ticketService, TicketServiceError } from "../ticket.service";
import { ticketIngestService } from "../ticket-ingest.service";
import { TicketCategory, TicketStatus, TicketPriority, ReplySenderType } from "@prisma/client";
import prisma from "../../../prisma";

describe("ticketService.getAllTickets", () => {
  it("sorts tickets by newest first by default", async () => {
    const timestamp = Date.now();
    const t1 = await ticketIngestService.ingestInboundEmail({
      from: `user1.${timestamp}@example.com`,
      subject: `Old Ticket ${timestamp}`,
      text: "Oldest body",
    });
    await prisma.ticket.update({ where: { id: t1.id }, data: { status: TicketStatus.OPEN } });

    // Small delay to guarantee different createdAt
    await new Promise((res) => setTimeout(res, 20));

    const t2 = await ticketIngestService.ingestInboundEmail({
      from: `user2.${timestamp}@example.com`,
      subject: `New Ticket ${timestamp}`,
      text: "Newest body",
    });
    await prisma.ticket.update({ where: { id: t2.id }, data: { status: TicketStatus.OPEN } });

    const { tickets } = await ticketService.getAllTickets();
    expect(tickets.length).toBeGreaterThanOrEqual(2);

    const index1 = tickets.findIndex((t) => t.id === t1.id);
    const index2 = tickets.findIndex((t) => t.id === t2.id);

    expect(index2).toBeLessThan(index1); // Newest ticket appears before older ticket
  });

  it("filters tickets by category", async () => {
    const timestamp = Date.now();
    const tTech = await ticketIngestService.ingestInboundEmail({
      from: `tech.${timestamp}@example.com`,
      subject: `Technical issue ${timestamp}`,
      text: "App crashes",
      category: TicketCategory.TECHNICAL_QUESTION,
    });
    await prisma.ticket.update({ where: { id: tTech.id }, data: { status: TicketStatus.OPEN } });

    const tRefund = await ticketIngestService.ingestInboundEmail({
      from: `refund.${timestamp}@example.com`,
      subject: `Refund please ${timestamp}`,
      text: "Want my money back",
      category: TicketCategory.REFUND_REQUEST,
    });
    await prisma.ticket.update({ where: { id: tRefund.id }, data: { status: TicketStatus.OPEN } });

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

    const t = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Course on ${uniqueTerm}`,
      text: "Need more details",
    });
    await prisma.ticket.update({ where: { id: t.id }, data: { status: TicketStatus.OPEN } });

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
    await prisma.ticket.update({ where: { id: t1.id }, data: { status: TicketStatus.OPEN } });

    await new Promise((res) => setTimeout(res, 25));

    const t2 = await ticketIngestService.ingestInboundEmail({
      from: `user-new.${timestamp}@example.com`,
      subject: `New Ticket Sort ${timestamp}`,
      text: "Second created",
    });
    await prisma.ticket.update({ where: { id: t2.id }, data: { status: TicketStatus.OPEN } });

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
        status: TicketStatus.OPEN,
        priority: TicketPriority.LOW,
      },
    });

    const highTicket = await prisma.ticket.create({
      data: {
        subject: `High Priority ${timestamp}`,
        body: "High",
        senderName: "High User",
        senderEmail: `high.${timestamp}@example.com`,
        status: TicketStatus.OPEN,
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
        status: TicketStatus.OPEN,
      },
    });

    const tZ = await prisma.ticket.create({
      data: {
        subject: `ZZZ Ticket ${timestamp}`,
        body: "Body Z",
        senderName: "Sender Z",
        senderEmail: `z.${timestamp}@example.com`,
        status: TicketStatus.OPEN,
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
        status: TicketStatus.OPEN,
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
        status: TicketStatus.OPEN,
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

describe("ticketService.getTicketById", () => {
  it("returns ticket by id when it exists, including assignedTo user relation", async () => {
    const timestamp = Date.now();
    const created = await ticketIngestService.ingestInboundEmail({
      from: `Customer ${timestamp} <customer.${timestamp}@example.com>`,
      subject: `Single Ticket Test ${timestamp}`,
      text: "Detailed content for single ticket inspection",
      category: TicketCategory.TECHNICAL_QUESTION,
    });

    const ticket = await ticketService.getTicketById(created.id);
    expect(ticket).not.toBeNull();
    expect(ticket?.id).toBe(created.id);
    expect(ticket?.subject).toBe(`Single Ticket Test ${timestamp}`);
    expect(ticket?.senderName).toBe(`Customer ${timestamp}`);
    expect(ticket?.senderEmail).toBe(`customer.${timestamp}@example.com`);
    expect(ticket?.category).toBe(TicketCategory.TECHNICAL_QUESTION);
    expect(ticket?.body).toBe("Detailed content for single ticket inspection");
    expect(ticket?.assignedTo?.name).toBe("AI");
  });

  it("returns null when ticket does not exist", async () => {
    const ticket = await ticketService.getTicketById(999999999);
    expect(ticket).toBeNull();
  });
});

describe("ticketService.assignTicket", () => {
  it("assigns a ticket to an active agent and returns updated ticket with assignedTo relation", async () => {
    const timestamp = Date.now();
    const agent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Agent Test ${timestamp}`,
        email: `agent.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Assign Test ${timestamp}`,
      text: "Assign me please",
    });

    const updated = await ticketService.assignTicket(ticket.id, agent.id);
    expect(updated.assignedToId).toBe(agent.id);
    expect((updated as any).assignedTo?.name).toBe(agent.name);
    expect((updated as any).assignedTo?.email).toBe(agent.email);
  });

  it("reassigns a ticket to a different agent", async () => {
    const timestamp = Date.now();
    const agent1 = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Agent One ${timestamp}`,
        email: `agent1.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const agent2 = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Agent Two ${timestamp}`,
        email: `agent2.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Reassign Test ${timestamp}`,
      text: "Reassign me please",
    });

    await ticketService.assignTicket(ticket.id, agent1.id);
    const reassigned = await ticketService.assignTicket(ticket.id, agent2.id);

    expect(reassigned.assignedToId).toBe(agent2.id);
    expect((reassigned as any).assignedTo?.name).toBe(agent2.name);
  });

  it("unassigns a ticket when null is passed as assignedToId", async () => {
    const timestamp = Date.now();
    const agent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Agent Unassign ${timestamp}`,
        email: `unassign.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Unassign Ticket ${timestamp}`,
      text: "Unassign testing",
    });

    await ticketService.assignTicket(ticket.id, agent.id);
    const unassigned = await ticketService.assignTicket(ticket.id, null);

    expect(unassigned.assignedToId).toBeNull();
    expect((unassigned as any).assignedTo).toBeNull();
  });

  it("throws 404 TicketServiceError when ticket ID does not exist", async () => {
    expect(ticketService.assignTicket(999999999, null)).rejects.toThrow(TicketServiceError);
    try {
      await ticketService.assignTicket(999999999, null);
    } catch (err: any) {
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("Ticket not found");
    }
  });

  it("throws 400 TicketServiceError when assigned user ID does not exist", async () => {
    const timestamp = Date.now();
    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Invalid User Test ${timestamp}`,
      text: "Invalid user",
    });

    try {
      await ticketService.assignTicket(ticket.id, "non-existent-user-id");
      expect(true).toBe(false); // should not reach
    } catch (err: any) {
      expect(err).toBeInstanceOf(TicketServiceError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain("not found");
    }
  });

  it("throws 400 TicketServiceError when assigned user is soft-deleted", async () => {
    const timestamp = Date.now();
    const deletedUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Deleted User ${timestamp}`,
        email: `deleted.${timestamp}@example.com`,
        role: "AGENT",
        deletedAt: new Date(),
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Deleted User Ticket ${timestamp}`,
      text: "Testing soft delete assignment",
    });

    try {
      await ticketService.assignTicket(ticket.id, deletedUser.id);
      expect(true).toBe(false); // should not reach
    } catch (err: any) {
      expect(err).toBeInstanceOf(TicketServiceError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toContain("deactivated");
    }
  });
});

describe("ticketService.getAssignableUsers", () => {
  it("returns active users and excludes soft-deleted users", async () => {
    const timestamp = Date.now();
    const activeAgent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Active Agent ${timestamp}`,
        email: `active.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const softDeletedAgent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Deleted Agent ${timestamp}`,
        email: `deletedagent.${timestamp}@example.com`,
        role: "AGENT",
        deletedAt: new Date(),
      },
    });

    const assignees = await ticketService.getAssignableUsers();
    const foundActive = assignees.find((u) => u.id === activeAgent.id);
    const foundDeleted = assignees.find((u) => u.id === softDeletedAgent.id);

    expect(foundActive).toBeDefined();
    expect(foundActive?.name).toBe(activeAgent.name);
    expect(foundDeleted).toBeUndefined();
  });
});

describe("ticketService.updateTicket", () => {
  it("updates status from OPEN to RESOLVED and then to CLOSED", async () => {
    const timestamp = Date.now();
    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Status Update Test ${timestamp}`,
      text: "Testing status change",
    });
    expect(ticket.status).toBe(TicketStatus.NEW);

    const resolvedTicket = await ticketService.updateTicket(ticket.id, {
      status: TicketStatus.RESOLVED,
    });
    expect(resolvedTicket.status).toBe(TicketStatus.RESOLVED);

    const closedTicket = await ticketService.updateTicket(ticket.id, {
      status: TicketStatus.CLOSED,
    });
    expect(closedTicket.status).toBe(TicketStatus.CLOSED);
  });

  it("updates category from GENERAL_QUESTION to TECHNICAL_QUESTION and to null (uncategorized)", async () => {
    const timestamp = Date.now();
    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Category Update Test ${timestamp}`,
      text: "Testing category change",
      category: TicketCategory.GENERAL_QUESTION,
    });
    expect(ticket.category).toBe(TicketCategory.GENERAL_QUESTION);

    const updatedTech = await ticketService.updateTicket(ticket.id, {
      category: TicketCategory.TECHNICAL_QUESTION,
    });
    expect(updatedTech.category).toBe(TicketCategory.TECHNICAL_QUESTION);

    const uncatTicket = await ticketService.updateTicket(ticket.id, {
      category: null,
    });
    expect(uncatTicket.category).toBeNull();
  });

  it("updates multiple fields including status and category together", async () => {
    const timestamp = Date.now();
    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `student.${timestamp}@example.com`,
      subject: `Multi Update Test ${timestamp}`,
      text: "Multi update testing",
    });

    const updated = await ticketService.updateTicket(ticket.id, {
      status: TicketStatus.RESOLVED,
      category: TicketCategory.REFUND_REQUEST,
      priority: TicketPriority.HIGH,
    });

    expect(updated.status).toBe(TicketStatus.RESOLVED);
    expect(updated.category).toBe(TicketCategory.REFUND_REQUEST);
    expect(updated.priority).toBe(TicketPriority.HIGH);
  });

  it("throws 404 TicketServiceError when ticket does not exist", async () => {
    try {
      await ticketService.updateTicket(999999999, { status: TicketStatus.RESOLVED });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(TicketServiceError);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("Ticket not found");
    }
  });
});

describe("ticketService.createReply and getRepliesByTicketId", () => {
  it("creates an AGENT reply with valid user and returns reply with user details", async () => {
    const timestamp = Date.now();
    const agent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Agent ${timestamp}`,
        email: `agent.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `customer.${timestamp}@example.com`,
      subject: `Reply Test ${timestamp}`,
      text: "Initial question",
    });

    const reply = await ticketService.createReply(
      ticket.id,
      agent.id,
      "We are working on your issue."
    );

    expect(reply.id).toBeGreaterThan(0);
    expect(reply.ticketId).toBe(ticket.id);
    expect(reply.userId).toBe(agent.id);
    expect(reply.senderType).toBe(ReplySenderType.AGENT);
    expect(reply.body).toBe("We are working on your issue.");
    expect(reply.user).not.toBeNull();
    expect(reply.user?.name).toBe(`Agent ${timestamp}`);
    expect(reply.user?.role).toBe("AGENT");
  });

  it("creates a CUSTOMER reply with null userId and senderType CUSTOMER", async () => {
    const timestamp = Date.now();
    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `customer.${timestamp}@example.com`,
      subject: `Customer Reply Test ${timestamp}`,
      text: "Help needed",
    });

    const reply = await ticketService.createReply(
      ticket.id,
      null,
      "Here is additional info from the student.",
      { senderType: ReplySenderType.CUSTOMER }
    );

    expect(reply.id).toBeGreaterThan(0);
    expect(reply.ticketId).toBe(ticket.id);
    expect(reply.userId).toBeNull();
    expect(reply.senderType).toBe(ReplySenderType.CUSTOMER);
    expect(reply.body).toBe("Here is additional info from the student.");
  });

  it("updates ticket updatedAt and optional status when reply is submitted", async () => {
    const timestamp = Date.now();
    const agent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Agent Resolver ${timestamp}`,
        email: `resolver.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `customer.${timestamp}@example.com`,
      subject: `Status Update on Reply ${timestamp}`,
      text: "Please resolve this",
    });

    expect(ticket.status).toBe(TicketStatus.NEW);

    await ticketService.createReply(
      ticket.id,
      agent.id,
      "This issue is now resolved!",
      { status: TicketStatus.RESOLVED }
    );

    const updated = await ticketService.getTicketById(ticket.id);
    expect(updated?.status).toBe(TicketStatus.RESOLVED);
    expect(updated?.replies?.length).toBe(1);
    expect(updated?.replies?.[0].body).toBe("This issue is now resolved!");
  });

  it("returns replies in chronological order via getRepliesByTicketId and getTicketById", async () => {
    const timestamp = Date.now();
    const agent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Order Agent ${timestamp}`,
        email: `order.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `customer.${timestamp}@example.com`,
      subject: `Order Test ${timestamp}`,
      text: "Order content",
    });

    const r1 = await ticketService.createReply(ticket.id, agent.id, "First reply");
    await new Promise((res) => setTimeout(res, 20));
    const r2 = await ticketService.createReply(
      ticket.id,
      null,
      "Second reply from customer",
      { senderType: ReplySenderType.CUSTOMER }
    );
    await new Promise((res) => setTimeout(res, 20));
    const r3 = await ticketService.createReply(ticket.id, agent.id, "Third reply");

    const replies = await ticketService.getRepliesByTicketId(ticket.id);
    expect(replies.length).toBe(3);
    expect(replies[0].id).toBe(r1.id);
    expect(replies[1].id).toBe(r2.id);
    expect(replies[2].id).toBe(r3.id);

    const fullTicket = await ticketService.getTicketById(ticket.id);
    expect(fullTicket?.replies?.length).toBe(3);
    expect(fullTicket?.replies?.[0].body).toBe("First reply");
    expect(fullTicket?.replies?.[1].senderType).toBe(ReplySenderType.CUSTOMER);
    expect(fullTicket?.replies?.[2].body).toBe("Third reply");
  });

  it("throws 404 TicketServiceError when ticket does not exist", async () => {
    try {
      await ticketService.createReply(999999999, "user-id", "Some reply");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(TicketServiceError);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe("Ticket not found");
    }
  });

  it("throws 400 TicketServiceError when agent user is deactivated or does not exist", async () => {
    const timestamp = Date.now();
    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `customer.${timestamp}@example.com`,
      subject: `Deactivated User Test ${timestamp}`,
      text: "Inquiry",
    });

    const deactivatedAgent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Deactivated Agent ${timestamp}`,
        email: `deactivated.${timestamp}@example.com`,
        role: "AGENT",
        deletedAt: new Date(),
      },
    });

    try {
      await ticketService.createReply(ticket.id, deactivatedAgent.id, "Attempted reply");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(TicketServiceError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe("User not found or deactivated");
    }
  });

  it("cascades deletion so deleting a ticket removes its replies", async () => {
    const timestamp = Date.now();
    const agent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Cascade Agent ${timestamp}`,
        email: `cascade.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `customer.${timestamp}@example.com`,
      subject: `Cascade Delete Test ${timestamp}`,
      text: "Cascade content",
    });

    await ticketService.createReply(ticket.id, agent.id, "Reply to be deleted");

    const repliesBefore = await prisma.ticketReply.findMany({
      where: { ticketId: ticket.id },
    });
    expect(repliesBefore.length).toBe(1);

    await prisma.ticket.delete({ where: { id: ticket.id } });

    const repliesAfter = await prisma.ticketReply.findMany({
      where: { ticketId: ticket.id },
    });
    expect(repliesAfter.length).toBe(0);
  });

  it("throws 400 TicketServiceError when attempting to reply to a closed ticket", async () => {
    const timestamp = Date.now();
    const agent = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        name: `Closed Agent ${timestamp}`,
        email: `closed.${timestamp}@example.com`,
        role: "AGENT",
      },
    });

    const ticket = await ticketIngestService.ingestInboundEmail({
      from: `customer.${timestamp}@example.com`,
      subject: `Closed Ticket Reply Test ${timestamp}`,
      text: "Problem description",
    });

    // Close the ticket
    await ticketService.updateTicket(ticket.id, { status: TicketStatus.CLOSED });

    try {
      await ticketService.createReply(ticket.id, agent.id, "Attempted reply on closed ticket");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(TicketServiceError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe("Cannot add replies to a closed ticket");
    }
  });
});




