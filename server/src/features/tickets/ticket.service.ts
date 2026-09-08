import prisma from "../../prisma";
import type { Ticket, Prisma } from "@prisma/client";
import type {
  TicketFilterQuery,
  TicketCounts,
  PaginatedTicketsResult,
} from "./ticket.types";

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
}

export const ticketService = new TicketService();

