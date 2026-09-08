import prisma from "../../prisma";
import type { Ticket, Prisma } from "@prisma/client";
import type {
  TicketFilterQuery,
  TicketCounts,
  PaginatedTicketsResult,
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
   * Fetch a single ticket by its auto-increment integer ID.
   */
  async getTicketById(id: number): Promise<Ticket | null> {
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
   * Retrieve total counts of tickets broken down by status.
   */
  async getTicketCounts(): Promise<TicketCounts> {
    const [total, open, resolved, closed] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: "OPEN" } }),
      prisma.ticket.count({ where: { status: "RESOLVED" } }),
      prisma.ticket.count({ where: { status: "CLOSED" } }),
    ]);

    return { total, open, resolved, closed };
  }

  /**
   * Assign or reassign a ticket to a user, or unassign if assignedToId is null.
   * Validates that the ticket exists, and if assignedToId is provided, validates that the user exists and is not soft-deleted.
   */
  async assignTicket(ticketId: number, assignedToId: string | null): Promise<Ticket> {
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
  async updateTicket(ticketId: number, input: UpdateTicketInput): Promise<Ticket> {
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
      },
    });
  }
}

export const ticketService = new TicketService();

