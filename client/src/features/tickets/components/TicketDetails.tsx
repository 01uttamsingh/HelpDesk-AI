import { useState } from "react";
import DOMPurify from "dompurify";
import type { TicketItem } from "../types";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { formatDate } from "../utils/date";
import { Clock, Mail, User, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { useSummarizeTicket } from "../hooks/useSummarizeTicket";
import { getErrorMessage } from "@/features/users/utils/error";

export interface TicketDetailsProps {
  ticket: TicketItem;
}

function cleanSummaryText(text: string): string {
  if (!text) return "";
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^[-*•+]\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function TicketDetails({ ticket }: TicketDetailsProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const {
    mutate: generateSummary,
    isPending: isSummarizing,
    error,
  } = useSummarizeTicket(ticket.id);

  const handleSummarize = () => {
    generateSummary(undefined, {
      onSuccess: (data) => {
        setSummary(cleanSummaryText(data.summary));
      },
    });
  };

  const errorMessage = error
    ? getErrorMessage(error, "Failed to summarize ticket.")
    : null;

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

        <CardContent className="pt-6 space-y-4">
          <div
            className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans break-words"
            data-testid="ticket-detail-body"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(ticket.body || ""),
            }}
          />

          {/* Below the message: Summarize Button & Summary Display */}
          <div className="pt-4 border-t border-border/60 space-y-3" data-testid="ticket-summary-section">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSummarize}
                disabled={isSummarizing}
                className="gap-1.5 text-xs font-medium"
                data-testid="summarize-ticket-button"
              >
                {isSummarizing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Summarizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>Summarize</span>
                  </>
                )}
              </Button>

              {summary && !isSummarizing && (
                <span className="text-[11px] text-muted-foreground">
                  AI-generated summary
                </span>
              )}
            </div>

            {errorMessage && (
              <Alert variant="destructive" data-testid="summary-error-alert">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs font-semibold">Error</AlertTitle>
                <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
              </Alert>
            )}

            {summary && (
              <div
                data-testid="ticket-summary-content"
                className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2 text-foreground"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>Ticket & Conversation Summary</span>
                </div>
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                  {summary}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
