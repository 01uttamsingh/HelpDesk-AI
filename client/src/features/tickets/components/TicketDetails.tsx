import type { TicketItem } from "../types";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate } from "../utils/date";
import { Clock, Mail, User } from "lucide-react";

export interface TicketDetailsProps {
  ticket: TicketItem;
}

export function TicketDetails({ ticket }: TicketDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Ticket Header & Metadata */}
      <div className="space-y-3 pb-2 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-muted text-foreground border border-border"
            data-testid="ticket-detail-id"
          >
            #{ticket.id}
          </span>
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          <TicketCategoryBadge category={ticket.category} />
        </div>

        <h1
          className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          data-testid="ticket-detail-subject"
        >
          {ticket.subject}
        </h1>
      </div>

      {/* Main Content (Customer Inquiry / Message) */}
      <Card data-testid="ticket-message-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm border border-primary/20">
              {ticket.senderName ? ticket.senderName.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
            </div>
            <div>
              <div className="font-semibold text-foreground text-sm" data-testid="ticket-sender-name">
                {ticket.senderName}
              </div>
              <a
                href={`mailto:${ticket.senderEmail}`}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                data-testid="ticket-sender-email"
              >
                <Mail className="h-3 w-3" />
                {ticket.senderEmail}
              </a>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap"
            data-testid="ticket-detail-timestamp"
          >
            <Clock className="h-3.5 w-3.5" />
            <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div
            className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans break-words"
            data-testid="ticket-detail-body"
          >
            {ticket.body}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
