import { cn } from "@/lib/utils";
import type { TicketPriority } from "../types";

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
  className?: string;
}

export function TicketPriorityBadge({ priority, className }: TicketPriorityBadgeProps) {
  const config = {
    HIGH: {
      label: "High",
      badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    },
    MEDIUM: {
      label: "Medium",
      badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
    LOW: {
      label: "Low",
      badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
    },
  }[priority] ?? {
    label: priority,
    badgeClass: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        config.badgeClass,
        className
      )}
      data-testid="ticket-priority-badge"
    >
      {config.label}
    </span>
  );
}
