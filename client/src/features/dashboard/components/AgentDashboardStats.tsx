import { Link } from "react-router-dom";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserCheck,
  Clock,
  CheckCircle2,
  Archive,
  ArrowUpRight,
} from "lucide-react";
import type { AgentStatsData } from "../types";

interface AgentDashboardStatsProps {
  stats?: AgentStatsData;
  isLoading?: boolean;
}

export function AgentDashboardStats({ stats, isLoading = false }: AgentDashboardStatsProps) {
  return (
    <div className="space-y-4" data-testid="agent-stats-cards">
      {/* 5 Workload & Queue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Total Open Tickets (Team Queue) */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="agent-total-open">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Open Tickets
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats?.openTickets ?? 0}
            </div>
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">Team open queue</p>
              <Link
                to="/tickets?status=OPEN"
                className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline gap-0.5"
              >
                <span>View queue</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
        {/* 1. Total Assigned Tickets */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="agent-assigned-total">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned to Me
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats?.assignedTicketsCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Your active ticket load
            </p>
          </CardContent>
        </Card>

        {/* 2. My Open Tickets */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="agent-assigned-open">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              My Open Tickets
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats?.assignedOpenCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Requires your response
            </p>
          </CardContent>
        </Card>

        {/* 3. My Resolved Tickets */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="agent-assigned-resolved">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              My Resolved
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats?.assignedResolvedCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Awaiting customer closure
            </p>
          </CardContent>
        </Card>

        {/* 4. My Closed Tickets */}
        <Card className="border-border bg-card shadow-xs transition-shadow hover:shadow-sm" data-testid="agent-assigned-closed">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              My Closed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
              <Archive className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-foreground">
              {isLoading ? <Skeleton className="h-8 w-12" /> : stats?.assignedClosedCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Successfully completed
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
