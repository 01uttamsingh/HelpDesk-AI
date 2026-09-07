import { Router } from "express";
import { ticketController } from "./ticket.controller";
import { requireAuth } from "../auth";

// Webhook Router (public, intended for email provider / webhook payloads)
export const webhookRoutes = Router();
webhookRoutes.post("/email", (req, res) => ticketController.handleInboundEmail(req, res));

// Ticket Router (for authenticated agents and inbound email alias)
export const ticketRoutes = Router();
ticketRoutes.post("/inbound", (req, res) => ticketController.handleInboundEmail(req, res));
ticketRoutes.get("/", requireAuth, (req, res) => ticketController.getTickets(req, res));
ticketRoutes.get("/:id", requireAuth, (req, res) => ticketController.getTicketById(req, res));
