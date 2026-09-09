import { describe, it, expect } from "bun:test";
import prisma from "../../../prisma";
import { Role, TicketStatus, TicketPriority } from "@prisma/client";
import { dashboardService } from "../dashboard.service";
import { dashboardController } from "../dashboard.controller";
import { getOrCreateAiAgent } from "../../tickets/ai-agent.utils";

describe("DashboardService", () => {
  describe("formatDuration", () => {
    it("formats 0 or negative values as '< 1m'", () => {
      expect(dashboardService.formatDuration(0)).toBe("< 1m");
      expect(dashboardService.formatDuration(-500)).toBe("< 1m");
      expect(dashboardService.formatDuration(NaN)).toBe("< 1m");
    });

    it("formats durations under 1 minute as '< 1m'", () => {
      expect(dashboardService.formatDuration(15_000)).toBe("< 1m");
      expect(dashboardService.formatDuration(59_999)).toBe("< 1m");
    });

    it("formats durations under 1 hour in minutes", () => {
      expect(dashboardService.formatDuration(60_000)).toBe("1m");
      expect(dashboardService.formatDuration(15 * 60_000)).toBe("15m");
      expect(dashboardService.formatDuration(45 * 60_000)).toBe("45m");
    });

    it("formats durations under 24 hours in hours and minutes", () => {
      expect(dashboardService.formatDuration(2 * 3600_000)).toBe("2h");
      expect(dashboardService.formatDuration(2 * 3600_000 + 15 * 60_000)).toBe("2h 15m");
      expect(dashboardService.formatDuration(5 * 3600_000 + 40 * 60_000)).toBe("5h 40m");
    });

    it("formats durations of 1 day or more in days and hours", () => {
      expect(dashboardService.formatDuration(24 * 3600_000)).toBe("1d");
      expect(dashboardService.formatDuration(28 * 3600_000)).toBe("1d 4h");
      expect(dashboardService.formatDuration(75 * 3600_000)).toBe("3d 3h");
    });
  });

  describe("getDailyTicketCounts", () => {
    it("returns exactly 30 consecutive calendar days with counts and labels", async () => {
      const daily = await dashboardService.getDailyTicketCounts(30);

      expect(daily.length).toBe(30);
      for (const day of daily) {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof day.label).toBe("string");
        expect(day.label.length).toBeGreaterThan(0);
        expect(typeof day.count).toBe("number");
        expect(day.count).toBeGreaterThanOrEqual(0);
      }

      // Verify dates are ordered chronologically
      for (let i = 1; i < daily.length; i++) {
        expect(new Date(daily[i].date).getTime()).toBeGreaterThan(new Date(daily[i - 1].date).getTime());
      }
    });

    it("accurately records newly created ticket into today's bucket", async () => {
      const initialDaily = await dashboardService.getDailyTicketCounts(30);
      const todayKey = new Date().toISOString().slice(0, 10);
      const todayInitialCount = initialDaily.find((d) => d.date === todayKey)?.count ?? 0;

      // Create an OPEN ticket today
      await prisma.ticket.create({
        data: {
          subject: `Daily chart test ticket ${Date.now()}`,
          body: "Testing daily chart counting",
          senderName: "Daily Tester",
          senderEmail: `tester.${Date.now()}@example.com`,
          status: TicketStatus.OPEN,
          priority: TicketPriority.LOW,
        },
      });

      const updatedDaily = await dashboardService.getDailyTicketCounts(30);
      const todayUpdatedCount = updatedDaily.find((d) => d.date === todayKey)?.count ?? 0;

      expect(todayUpdatedCount).toBe(todayInitialCount + 1);
    });
  });

  describe("getDashboardStats - Role-based responses", () => {
    it("returns both adminStats (with 5 KPIs and daily volume) and agentStats for ADMIN role", async () => {
      const admin = await prisma.user.findFirst({
        where: { role: Role.ADMIN, deletedAt: null },
      });
      expect(admin).not.toBeNull();

      const stats = await dashboardService.getDashboardStats(admin!.id, Role.ADMIN);

      expect(stats.role).toBe("ADMIN");
      expect(stats.adminStats).toBeDefined();

      const adminKpis = stats.adminStats!;
      expect(adminKpis.totalTickets).toBeGreaterThanOrEqual(0);
      expect(adminKpis.openTickets).toBeGreaterThanOrEqual(0);
      expect(adminKpis.aiResolvedTickets).toBeGreaterThanOrEqual(0);
      expect(adminKpis.aiResolvedPercentage).toBeGreaterThanOrEqual(0);
      expect(adminKpis.avgResolutionTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof adminKpis.avgResolutionTimeFormatted).toBe("string");
      expect(adminKpis.dailyTicketCounts.length).toBe(30);

      // Verify agent workload is also present
      expect(stats.agentStats).toBeDefined();
      expect(stats.agentStats.assignedTicketsCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.agentStats.recentAssignedTickets)).toBe(true);
    });

    it("returns only agentStats and omits adminStats for AGENT role", async () => {
      const agent = await prisma.user.findFirst({
        where: { role: Role.AGENT, deletedAt: null },
      });
      expect(agent).not.toBeNull();

      const stats = await dashboardService.getDashboardStats(agent!.id, Role.AGENT);

      expect(stats.role).toBe("AGENT");
      expect(stats.adminStats).toBeUndefined();

      expect(stats.agentStats).toBeDefined();
      expect(stats.agentStats.assignedTicketsCount).toBeGreaterThanOrEqual(0);
      expect(stats.agentStats.assignedOpenCount).toBeGreaterThanOrEqual(0);
      expect(stats.agentStats.assignedResolvedCount).toBeGreaterThanOrEqual(0);
      expect(stats.agentStats.assignedClosedCount).toBeGreaterThanOrEqual(0);
      expect(stats.agentStats.totalTickets).toBeGreaterThanOrEqual(0);
      expect(stats.agentStats.openTickets).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.agentStats.recentAssignedTickets)).toBe(true);
      expect(stats.agentStats.recentAssignedTickets.length).toBeLessThanOrEqual(10);
    });

    it("accurately counts assigned tickets and recent 10 tickets for a specific agent", async () => {
      // Create a test agent
      const testAgent = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: `Agent-${Date.now()}`,
          email: `agent-${Date.now()}@example.com`,
          role: Role.AGENT,
          emailVerified: true,
        },
      });

      // Create 3 tickets assigned to this agent with different statuses
      const t1 = await prisma.ticket.create({
        data: {
          subject: "Assigned Open Ticket",
          body: "Ticket 1",
          senderName: "User 1",
          senderEmail: "user1@example.com",
          status: TicketStatus.OPEN,
          priority: TicketPriority.HIGH,
          assignedToId: testAgent.id,
        },
      });

      const t2 = await prisma.ticket.create({
        data: {
          subject: "Assigned Resolved Ticket",
          body: "Ticket 2",
          senderName: "User 2",
          senderEmail: "user2@example.com",
          status: TicketStatus.RESOLVED,
          priority: TicketPriority.MEDIUM,
          assignedToId: testAgent.id,
        },
      });

      const stats = await dashboardService.getDashboardStats(testAgent.id, Role.AGENT);

      expect(stats.agentStats.assignedTicketsCount).toBe(2);
      expect(stats.agentStats.assignedOpenCount).toBe(1);
      expect(stats.agentStats.assignedResolvedCount).toBe(1);
      expect(stats.agentStats.assignedClosedCount).toBe(0);

      const recentIds = stats.agentStats.recentAssignedTickets.map((t) => t.id);
      expect(recentIds).toContain(t1.id);
      expect(recentIds).toContain(t2.id);
    });
  });

  describe("DashboardController", () => {
    it("returns 401 when request is unauthenticated", async () => {
      const req: any = { user: null };
      let statusCode = 0;
      let body: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              body = data;
            },
          };
        },
      };

      await dashboardController.getStats(req, res);
      expect(statusCode).toBe(401);
      expect(body.success).toBe(false);
    });

    it("returns 200 with dashboard data when user is authenticated", async () => {
      const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN, deletedAt: null } });
      const req: any = { user: admin };
      let statusCode = 0;
      let body: any = null;
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return {
            json: (data: any) => {
              body = data;
            },
          };
        },
      };

      await dashboardController.getStats(req, res);
      expect(statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.role).toBe("ADMIN");
      expect(body.data.adminStats).toBeDefined();
    });
  });
});
