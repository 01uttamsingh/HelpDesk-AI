import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { requireAuth } from "../auth";

export const dashboardRoutes = Router();

dashboardRoutes.get("/stats", requireAuth, (req, res) => dashboardController.getStats(req, res));
