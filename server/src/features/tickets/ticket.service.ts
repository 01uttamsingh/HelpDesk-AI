import prisma from "../../prisma";
import type { Ticket } from "@prisma/client";

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
   * Fetch all tickets ordered by creation date descending.
   */
  async getAllTickets(): Promise<Ticket[]> {
    return prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
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
