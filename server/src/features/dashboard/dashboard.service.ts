import prisma from "../../prisma";
import { TicketStatus, ReplySenderType, Role } from "@prisma/client";
import type {
  DailyTicketCount,
  AdminDashboardStats,
  AgentDashboardStats,
  RecentAssignedTicketItem,
  DashboardStatsData,
} from "./dashboard.types";

export class DashboardService {
  /**
   * Formats duration in milliseconds into a human-readable string (e.g. "2h 15m", "< 1m").
   */
  formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) {
      return "< 1m";
    }

    // Less than 1 minute
    if (ms < 60_000) {
      return "< 1m";
    }

    // Less than 1 hour (e.g. "45m")
    if (ms < 3_600_000) {
      return `${Math.round(ms / 60_000)}m`;
    }

    // Less than 24 hours (e.g. "2h 15m")
    if (ms < 86_400_000) {
      const hours = Math.floor(ms / 3_600_000);
      const mins = Math.round((ms % 3_600_000) / 60_000);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    // 1 day or more (e.g. "1d 4h")
    const days = Math.floor(ms / 86_400_000);
    const remainingHours = Math.round((ms % 86_400_000) / 3_600_000);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  /**
   * Aggregates daily ticket counts for the past 30 calendar days (inclusive of today).
   * Generates a continuous daily series so days with 0 tickets are preserved.
   */
  async getDailyTicketCounts(daysCount: number = 30): Promise<DailyTicketCount[]> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (daysCount - 1));
    startDate.setHours(0, 0, 0, 0);

    // Initialize daily map with 0 counts for all consecutive days
    const dailyMap = new Map<string, { label: string; count: number }>();

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap.set(key, { label, count: 0 });
    }

    // Fetch tickets created in this date range (excluding temporary NEW and PROCESSING states)
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { notIn: [TicketStatus.NEW, TicketStatus.PROCESSING] },
      },
      select: {
        createdAt: true,
      },
    });

    // Accumulate counts into respective calendar day
    for (const ticket of tickets) {
      const key = ticket.createdAt.toISOString().slice(0, 10);
      const existing = dailyMap.get(key);
      if (existing) {
        existing.count++;
      }
    }

    // Convert map to array
    const result: DailyTicketCount[] = [];
    for (const [date, val] of dailyMap.entries()) {
      result.push({
        date,
        label: val.label,
        count: val.count,
      });
    }

    return result;
  }

  /**
   * Retrieves comprehensive dashboard statistics for Admin and/or Agent views.
   */
  async getDashboardStats(userId: string, userRole?: Role | string): Promise<DashboardStatsData> {
    // 1. Calculate overall system ticket counts
    const [totalTickets, openTickets, resolvedTickets, closedTickets] = await Promise.all([
      prisma.ticket.count({
        where: { status: { notIn: [TicketStatus.NEW, TicketStatus.PROCESSING] } },
      }),
      prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      prisma.ticket.count({ where: { status: TicketStatus.RESOLVED } }),
      prisma.ticket.count({ where: { status: TicketStatus.CLOSED } }),
    ]);

    // 2. Calculate agent-specific workload metrics
    const [
      assignedTicketsCount,
      assignedOpenCount,
      assignedResolvedCount,
      assignedClosedCount,
      recentAssignedTicketsRaw,
    ] = await Promise.all([
      prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: { notIn: [TicketStatus.NEW, TicketStatus.PROCESSING] },
        },
      }),
      prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: TicketStatus.OPEN,
        },
      }),
      prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: TicketStatus.RESOLVED,
        },
      }),
      prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: TicketStatus.CLOSED,
        },
      }),
      prisma.ticket.findMany({
        where: {
          assignedToId: userId,
          status: { notIn: [TicketStatus.NEW, TicketStatus.PROCESSING] },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 10,
        select: {
          id: true,
          subject: true,
          body: true,
          senderName: true,
          senderEmail: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const recentAssignedTickets: RecentAssignedTicketItem[] = recentAssignedTicketsRaw.map((t) => ({
      id: t.id,
      subject: t.subject,
      body: t.body,
      senderName: t.senderName,
      senderEmail: t.senderEmail,
      status: t.status,
      priority: t.priority,
      category: t.category,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    const agentStats: AgentDashboardStats = {
      assignedTicketsCount,
      assignedOpenCount,
      assignedResolvedCount,
      assignedClosedCount,
      totalTickets,
      openTickets,
      resolvedTickets,
      closedTickets,
      recentAssignedTickets,
    };

    // If user is AGENT, return agent statistics without admin KPIs
    const isAdmin = typeof userRole === "string" ? userRole.toUpperCase() === Role.ADMIN : userRole === Role.ADMIN;
    if (!isAdmin) {
      return {
        role: "AGENT",
        agentStats,
      };
    }

    // 3. Admin KPIs: AI resolution, resolution time, 30-day volume
    const [aiResolvedTickets, resolvedList, dailyTicketCounts] = await Promise.all([
      prisma.ticket.count({
        where: {
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
          OR: [
            { replies: { some: { senderType: ReplySenderType.AI } } },
            { assignedTo: { name: "AI" } },
          ],
        },
      }),
      prisma.ticket.findMany({
        where: {
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          replies: {
            select: { createdAt: true, senderType: true },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.getDailyTicketCounts(30),
    ]);

    // Calculate AI resolution percentage (deflection rate against all tickets)
    const aiResolvedPercentage =
      totalTickets > 0
        ? Number(((aiResolvedTickets / totalTickets) * 100).toFixed(1))
        : 0;

    const totalResolvedOrClosed = resolvedTickets + closedTickets;
    const aiResolvedOfResolvedPercentage =
      totalResolvedOrClosed > 0
        ? Number(((aiResolvedTickets / totalResolvedOrClosed) * 100).toFixed(1))
        : 0;

    // Calculate average resolution time
    let totalDurationMs = 0;
    let measuredCount = 0;

    for (const ticket of resolvedList) {
      let resolutionTimeMs: number | null = null;

      // Find first reply by AI or last reply
      const aiReply = ticket.replies.find((r) => r.senderType === ReplySenderType.AI);
      if (aiReply) {
        resolutionTimeMs = aiReply.createdAt.getTime() - ticket.createdAt.getTime();
      } else if (ticket.replies.length > 0) {
        resolutionTimeMs = ticket.replies[0].createdAt.getTime() - ticket.createdAt.getTime();
      } else if (ticket.updatedAt.getTime() > ticket.createdAt.getTime()) {
        resolutionTimeMs = ticket.updatedAt.getTime() - ticket.createdAt.getTime();
      }

      if (resolutionTimeMs !== null && resolutionTimeMs > 0) {
        totalDurationMs += resolutionTimeMs;
        measuredCount++;
      }
    }

    const avgResolutionTimeMs =
      measuredCount > 0 ? Math.round(totalDurationMs / measuredCount) : 0;
    const avgResolutionTimeFormatted = this.formatDuration(avgResolutionTimeMs);

    const adminStats: AdminDashboardStats = {
      totalTickets,
      openTickets,
      aiResolvedTickets,
      aiResolvedPercentage,
      aiResolvedOfResolvedPercentage,
      avgResolutionTimeMs,
      avgResolutionTimeFormatted,
      resolvedTickets,
      closedTickets,
      dailyTicketCounts,
    };

    return {
      role: "ADMIN",
      adminStats,
      agentStats,
    };
  }
}

export const dashboardService = new DashboardService();
