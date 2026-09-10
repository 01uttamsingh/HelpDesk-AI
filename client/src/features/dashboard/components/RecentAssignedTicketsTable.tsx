import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketStatusBadge } from "@/features/tickets/components/TicketStatusBadge";
import { TicketPriorityBadge } from "@/features/tickets/components/TicketPriorityBadge";
import { TicketCategoryBadge } from "@/features/tickets/components/TicketCategoryBadge";
import { formatDate } from "@/features/tickets/utils/date";
import {
  Ticket as TicketIcon,
  Clock,
  ArrowRight,
  ExternalLink,
  Inbox,
} from "lucide-react";
import type { RecentAssignedTicketItem } from "../types";

interface RecentAssignedTicketsTableProps {
  tickets?: RecentAssignedTicketItem[];
  isLoading?: boolean;
}

export function RecentAssignedTicketsTable({
  tickets = [],
  isLoading = false,
}: RecentAssignedTicketsTableProps) {
  return (
    <Card className="border-border bg-card shadow-xs" data-testid="recent-assigned-tickets-table">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Assigned Tickets
            </CardTitle>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary border border-primary/20">
              {isLoading ? "..." : `${tickets.length} tickets`}
            </span>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Your 10 most recently updated or assigned support tickets
          </CardDescription>
        </div>

        <Link to="/tickets">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <span>View all tickets</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="divide-y divide-border p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between pt-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12 px-4 text-center" data-testid="empty-assigned-tickets">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No tickets assigned to you</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              You currently have no open or active tickets assigned. Browse the main queue to pick up unassigned tickets.
            </p>
            <Link to="/tickets?status=OPEN">
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <span>Browse open tickets</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Ticket</th>
                  <th className="py-3 px-3 sm:px-4">Customer</th>
                  <th className="py-3 px-3 sm:px-4">Status</th>
                  <th className="py-3 px-3 sm:px-4">Priority</th>
                  <th className="py-3 px-3 sm:px-4">Category</th>
                  <th className="py-3 px-3 sm:px-4">Updated</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-muted/30 transition-colors group"
                    data-testid={`recent-ticket-row-${ticket.id}`}
                  >
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-start gap-2 sm:gap-2.5">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <TicketIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 max-w-[140px] xs:max-w-[200px] sm:max-w-sm">
                          <Link
                            to={`/tickets/${ticket.id}`}
                            className="font-semibold text-foreground hover:text-primary transition-colors truncate block"
                            data-testid={`recent-ticket-subject-${ticket.id}`}
                          >
                            {ticket.subject}
                          </Link>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {ticket.body}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground">{ticket.senderName || "Unknown"}</p>
                        <p className="text-[11px] text-muted-foreground">{ticket.senderEmail}</p>
                      </div>
                    </td>

                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <TicketStatusBadge status={ticket.status} />
                    </td>

                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <TicketPriorityBadge priority={ticket.priority} />
                    </td>

                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <TicketCategoryBadge category={ticket.category} />
                    </td>

                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(ticket.updatedAt || ticket.createdAt)}
                    </td>

                    <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                      <Link to={`/tickets/${ticket.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 sm:px-2.5 text-xs gap-1 hover:text-primary"
                          title="Open ticket details"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
