import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ticket,
  Clock,
  Bot,
  Percent,
  Timer,
  CheckCircle2,
  Archive,
  ArrowUpRight,
} from "lucide-react";
import type { AdminStatsData } from "../types";

interface AdminDashboardStatsProps {
  stats?: AdminStatsData;
  isLoading?: boolean;
}

export function AdminDashboardStats({ stats, isLoading = false }: AdminDashboardStatsProps) {
  return (
    <div className="space-y-4" data-testid="admin-stats-cards">
      {/* 5 Core Management KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Tickets */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="admin-total-tickets">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Tickets
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Ticket className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats?.totalTickets ?? 0}
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">Active in system</p>
              <Link
                to="/tickets"
                className="inline-flex items-center text-xs font-medium text-primary hover:underline gap-0.5"
              >
                <span>View all</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 2. Open Tickets */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="admin-open-tickets">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Open Tickets
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats?.openTickets ?? 0}
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">Needs attention</p>
              <Link
                to="/tickets?status=OPEN"
                className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline gap-0.5"
              >
                <span>Review</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 3. Resolved by AI */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="admin-ai-resolved">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resolved by AI
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Bot className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats?.aiResolvedTickets ?? 0}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {isLoading ? (
                <Skeleton className="h-3 w-24" />
              ) : (
                `${stats?.aiResolvedOfResolvedPercentage ?? 0}% of resolved tickets`
              )}
            </p>
          </CardContent>
        </Card>

        {/* 4. % of Tickets Resolved by AI */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="admin-ai-percentage">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              % Resolved by AI
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Percent className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-16" /> : `${stats?.aiResolvedPercentage ?? 0}%`}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {isLoading ? (
                <Skeleton className="h-3 w-28" />
              ) : (
                `${stats?.aiResolvedTickets ?? 0} of ${stats?.totalTickets ?? 0} total tickets`
              )}
            </p>
          </CardContent>
        </Card>

        {/* 5. Average Resolution Time */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="admin-avg-resolution-time">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Resolution Time
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Timer className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                stats?.avgResolutionTimeFormatted || "< 1m"
              )}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              From arrival to resolution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Status Breakdown Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Resolved</p>
              <p className="text-base font-bold text-foreground">
                {isLoading ? "..." : stats?.resolvedTickets ?? 0}
              </p>
            </div>
          </div>
          <Link
            to="/tickets?status=RESOLVED"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <span>Browse</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
              <Archive className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Closed</p>
              <p className="text-base font-bold text-foreground">
                {isLoading ? "..." : stats?.closedTickets ?? 0}
              </p>
            </div>
          </div>
          <Link
            to="/tickets?status=CLOSED"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <span>Browse</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
