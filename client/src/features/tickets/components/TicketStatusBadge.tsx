import { cn } from "@/lib/utils";
import type { TicketStatus } from "../types";

interface TicketStatusBadgeProps {
  status: TicketStatus;
  className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const config = {
    NEW: {
      label: "New",
      badgeClass: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
      dotClass: "bg-sky-500",
    },
    PROCESSING: {
      label: "Processing",
      badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      dotClass: "bg-purple-500",
    },
    OPEN: {
      label: "Open",
      badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      dotClass: "bg-blue-500",
    },
    RESOLVED: {
      label: "Resolved",
      badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      dotClass: "bg-emerald-500",
    },
    CLOSED: {
      label: "Closed",
      badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
      dotClass: "bg-slate-400",
    },
  }[status] ?? {
    label: status,
    badgeClass: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.badgeClass,
        className
      )}
      data-testid="ticket-status-badge"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
      {config.label}
    </span>
  );
}
