import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  inboundEmailSchema,
  ticketIdParamSchema,
  ticketQuerySchema,
  assignTicketSchema,
} from "./ticket.schema";
import { ticketIngestService } from "./ticket-ingest.service";
import { ticketService, TicketServiceError } from "./ticket.service";

export class TicketController {
  /**
   * POST /api/webhooks/email
   * Ingests an inbound support email and converts it into a ticket.
   */
  async handleInboundEmail(req: Request, res: Response): Promise<void> {
    try {
      const validatedPayload = inboundEmailSchema.parse(req.body);
      const ticket = await ticketIngestService.ingestInboundEmail(validatedPayload);

      res.status(201).json({
        success: true,
        data: ticket,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Validation error",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      console.error("Inbound email ingestion failed:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process inbound email",
      });
    }
  }

  /**
   * GET /api/tickets/:id
   * Fetch a single ticket by its integer ID.
   */
  async getTicketById(req: Request, res: Response): Promise<void> {
    try {
      const parsedParams = ticketIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(400).json({
          success: false,
          error: "Invalid ticket ID. Must be a positive integer.",
        });
        return;
      }

      const ticket = await ticketService.getTicketById(parsedParams.data.id);
      if (!ticket) {
        res.status(404).json({
          success: false,
          error: "Ticket not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: ticket,
      });
    } catch (error: unknown) {
      console.error("Failed to retrieve ticket:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve ticket",
      });
    }
  }

  /**
   * GET /api/tickets
   * List all tickets (sorted newest first by default).
   */
  async getTickets(req: Request, res: Response): Promise<void> {
    try {
      const query = ticketQuerySchema.parse(req.query);
      const [{ tickets, pagination }, counts] = await Promise.all([
        ticketService.getAllTickets(query),
        ticketService.getTicketCounts(),
      ]);
      res.status(200).json({
        success: true,
        data: tickets,
        pagination,
        counts,
      });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid query parameters",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      console.error("Failed to retrieve tickets:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve tickets",
      });
    }
  }

  /**
   * PATCH /api/tickets/:id/assign
   * Assign or unassign a ticket to an agent.
   */
  async assignTicket(req: Request, res: Response): Promise<void> {
    try {
      const parsedParams = ticketIdParamSchema.safeParse(req.params);
      if (!parsedParams.success) {
        res.status(400).json({
          success: false,
          error: "Invalid ticket ID. Must be a positive integer.",
        });
        return;
      }

      const parsedBody = assignTicketSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          success: false,
          error: "Invalid assign payload",
          details: parsedBody.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      const updatedTicket = await ticketService.assignTicket(
        parsedParams.data.id,
        parsedBody.data.assignedToId ?? null
      );

      res.status(200).json({
        success: true,
        data: updatedTicket,
      });
    } catch (error: any) {
      if (error instanceof TicketServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.error("Failed to assign ticket:", error);
      res.status(500).json({
        success: false,
        error: "Failed to assign ticket",
      });
    }
  }

  /**
   * GET /api/tickets/assignees
   * Retrieve list of active users that can be assigned tickets.
   */
  async getAssignees(_req: Request, res: Response): Promise<void> {
    try {
      const assignees = await ticketService.getAssignableUsers();
      res.status(200).json({
        success: true,
        data: assignees,
      });
    } catch (error) {
      console.error("Failed to retrieve assignees:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve assignable users",
      });
    }
  }
}

export const ticketController = new TicketController();
