import { Card } from "@/components/ui/card";
import { Ticket, Clock, CheckCircle2, Archive } from "lucide-react";

interface TicketStatsCardsProps {
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  isLoading: boolean;
}

export function TicketStatsCards({
  totalCount,
  openCount,
  resolvedCount,
  closedCount,
  isLoading,
}: TicketStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" data-testid="ticket-stats-cards">
      <Card className="p-3 sm:p-4 border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Tickets</span>
          <Ticket className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold text-foreground">
          {isLoading ? "..." : totalCount}
        </div>
      </Card>

      <Card className="p-3 sm:p-4 border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Open</span>
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold text-foreground">
          {isLoading ? "..." : openCount}
        </div>
      </Card>

      <Card className="p-3 sm:p-4 border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Resolved</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold text-foreground">
          {isLoading ? "..." : resolvedCount}
        </div>
      </Card>

      <Card className="p-3 sm:p-4 border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Closed</span>
          <Archive className="h-4 w-4 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold text-foreground">
          {isLoading ? "..." : closedCount}
        </div>
      </Card>
    </div>
  );
}
