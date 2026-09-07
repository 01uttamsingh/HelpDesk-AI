import { Ticket as TicketIcon, Inbox, Calendar, User, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";
import type { TicketItem } from "../types";

interface TicketsTableProps {
  tickets: TicketItem[];
  isLoading: boolean;
  searchQuery: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onSelectTicket?: (ticket: TicketItem) => void;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function TicketsTable({
  tickets,
  isLoading,
  searchQuery,
  hasActiveFilters,
  onClearFilters,
  onSelectTicket,
}: TicketsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="tickets-table">
          <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Ticket
              </th>
              <th scope="col" className="px-6 py-3.5">
                Customer
              </th>
              <th scope="col" className="px-6 py-3.5">
                Category
              </th>
              <th scope="col" className="px-6 py-3.5">
                Priority
              </th>
              <th scope="col" className="px-6 py-3.5">
                Status
              </th>
              <th scope="col" className="px-6 py-3.5">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Skeleton loading state
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} data-testid="ticket-skeleton-row">
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                </tr>
              ))
            ) : tickets.length > 0 ? (
              // Ticket Rows (Sorted Newest First)
              tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => onSelectTicket?.(ticket)}
                  className={`group transition-colors hover:bg-muted/50 ${
                    onSelectTicket ? "cursor-pointer" : ""
                  }`}
                  data-testid={`ticket-row-${ticket.id}`}
                >
                  {/* Ticket ID & Subject / Preview */}
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <TicketIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-muted-foreground">
                            #{ticket.id}
                          </span>
                          <span className="font-semibold text-foreground truncate block">
                            {ticket.subject || "(No Subject)"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
                          {ticket.body}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Customer (Sender Name & Email) */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground text-xs truncate max-w-[160px]">
                          {ticket.senderName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[160px]">{ticket.senderEmail}</span>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4">
                    <TicketCategoryBadge category={ticket.category} />
                  </td>

                  {/* Priority */}
                  <td className="px-6 py-4">
                    <TicketPriorityBadge priority={ticket.priority} />
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <TicketStatusBadge status={ticket.status} />
                  </td>

                  {/* Created Date */}
                  <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              // Empty State
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {hasActiveFilters ? "No matching tickets found" : "No tickets yet"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hasActiveFilters
                          ? `No tickets match your filters${
                              searchQuery ? ` for "${searchQuery}"` : ""
                            }. Try clearing filters.`
                          : "Inbound student support emails will automatically appear here as tickets."}
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClearFilters}
                        data-testid="clear-filters-button"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
