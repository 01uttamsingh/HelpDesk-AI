import type { Response } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware";
import { dashboardService } from "./dashboard.service";

export class DashboardController {
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const stats = await dashboardService.getDashboardStats(req.user.id, req.user.role);
      return res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      console.error("Failed to retrieve dashboard statistics:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Failed to retrieve dashboard statistics",
      });
    }
  }
}

export const dashboardController = new DashboardController();
