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
      <Card className="p-3.5 sm:p-4 border-border/70 bg-card hover:border-primary/40 hover:shadow-xs transition-all duration-150 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Total Tickets</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Ticket className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {isLoading ? "..." : totalCount}
        </div>
      </Card>

      <Card className="p-3.5 sm:p-4 border-border/70 bg-card hover:border-amber-500/40 hover:shadow-xs transition-all duration-150 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Open</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {isLoading ? "..." : openCount}
        </div>
      </Card>

      <Card className="p-3.5 sm:p-4 border-border/70 bg-card hover:border-emerald-500/40 hover:shadow-xs transition-all duration-150 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Resolved</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {isLoading ? "..." : resolvedCount}
        </div>
      </Card>

      <Card className="p-3.5 sm:p-4 border-border/70 bg-card hover:border-slate-500/40 hover:shadow-xs transition-all duration-150 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Closed</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Archive className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {isLoading ? "..." : closedCount}
        </div>
      </Card>
    </div>
  );
}
