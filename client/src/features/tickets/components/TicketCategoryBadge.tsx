import { cn } from "@/lib/utils";
import type { TicketCategory } from "../types";

interface TicketCategoryBadgeProps {
  category?: TicketCategory | null;
  className?: string;
}

export function TicketCategoryBadge({ category, className }: TicketCategoryBadgeProps) {
  if (!category) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border",
          className
        )}
        data-testid="ticket-category-badge"
      >
        Uncategorized
      </span>
    );
  }

  const config = {
    GENERAL_QUESTION: {
      label: "General Question",
      badgeClass: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    },
    TECHNICAL_QUESTION: {
      label: "Technical Question",
      badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    },
    REFUND_REQUEST: {
      label: "Refund Request",
      badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    },
  }[category] ?? {
    label: category,
    badgeClass: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.badgeClass,
        className
      )}
      data-testid="ticket-category-badge"
    >
      {config.label}
    </span>
  );
}
