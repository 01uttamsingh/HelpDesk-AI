import prisma from "../../prisma";
import type { Ticket, Prisma } from "@prisma/client";
import type { TicketFilterQuery } from "./ticket.types";

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
   * Fetch tickets sorted by newest first (createdAt: "desc") by default,
   * with optional filtering by status, category, search text, or sort order.
   */
  async getAllTickets(query?: TicketFilterQuery): Promise<Ticket[]> {
    const where: Prisma.TicketWhereInput = {};

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.category) {
      where.category = query.category;
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

    return prisma.ticket.findMany({
      where,
      orderBy,
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
