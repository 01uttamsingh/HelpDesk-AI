import { Router } from "express";
import { ticketController } from "./ticket.controller";
import { ticketClassificationService } from "./ticket-classification.service";
import { ticketAutoResolveService } from "./ticket-auto-resolve.service";
import { requireAuth } from "../auth";

// Webhook Router (public, intended for email provider / webhook payloads)
export const webhookRoutes = Router();
webhookRoutes.post("/email", async (req, res) => {
  const ticket = await ticketController.handleInboundEmail(req, res);
  if (ticket && !ticket.isReply) {
    if (!ticket.category) {
      ticketClassificationService.classifyTicketAsync(ticket.id);
    }
    ticketAutoResolveService.autoResolveTicketAsync(ticket.id);
  }
});

// Ticket Router (for authenticated agents and inbound email alias)
export const ticketRoutes = Router();
ticketRoutes.post("/inbound", async (req, res) => {
  const ticket = await ticketController.handleInboundEmail(req, res);
  if (ticket && !ticket.isReply) {
    if (!ticket.category) {
      ticketClassificationService.classifyTicketAsync(ticket.id);
    }
    ticketAutoResolveService.autoResolveTicketAsync(ticket.id);
  }
});
ticketRoutes.get("/", requireAuth, (req, res) => ticketController.getTickets(req, res));
ticketRoutes.get("/assignees", requireAuth, (req, res) => ticketController.getAssignees(req, res));
ticketRoutes.get("/:id", requireAuth, (req, res) => ticketController.getTicketById(req, res));
ticketRoutes.patch("/:id", requireAuth, (req, res) => ticketController.updateTicket(req, res));
ticketRoutes.patch("/:id/assign", requireAuth, (req, res) => ticketController.assignTicket(req, res));
ticketRoutes.get("/:id/replies", requireAuth, (req, res) => ticketController.getReplies(req, res));
ticketRoutes.post("/:id/replies", requireAuth, (req, res) => ticketController.createReply(req, res));
ticketRoutes.post("/polish-reply", requireAuth, (req, res) => ticketController.polishReply(req, res));
ticketRoutes.post("/:id/polish-reply", requireAuth, (req, res) => ticketController.polishReply(req, res));
ticketRoutes.post("/:id/summarize", requireAuth, (req, res) => ticketController.summarizeTicket(req, res));
ticketRoutes.post("/:id/classify", requireAuth, (req, res) => ticketController.classifyTicket(req, res));
ticketRoutes.post("/:id/auto-resolve", requireAuth, (req, res) => ticketController.autoResolveTicket(req, res));



