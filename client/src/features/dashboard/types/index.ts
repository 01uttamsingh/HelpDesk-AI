import type { TicketStatus, TicketPriority, TicketCategory } from "@/features/tickets/types";

export interface DailyTicketCount {
  date: string; // ISO format "YYYY-MM-DD"
  label: string; // e.g. "Aug 11"
  count: number;
}

export interface AdminStatsData {
  totalTickets: number;
  openTickets: number;
  aiResolvedTickets: number;
  aiResolvedPercentage: number;
  aiResolvedOfResolvedPercentage: number;
  avgResolutionTimeMs: number;
  avgResolutionTimeFormatted: string;
  resolvedTickets: number;
  closedTickets: number;
  dailyTicketCounts: DailyTicketCount[];
}

export interface RecentAssignedTicketItem {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStatsData {
  assignedTicketsCount: number;
  assignedOpenCount: number;
  assignedResolvedCount: number;
  assignedClosedCount: number;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  recentAssignedTickets: RecentAssignedTicketItem[];
}

export interface DashboardStatsData {
  role: "ADMIN" | "AGENT";
  adminStats?: AdminStatsData;
  agentStats: AgentStatsData;
}
