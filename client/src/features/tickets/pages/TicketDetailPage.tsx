import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Mail,
  User,
  Clock,
  Inbox,
  Ticket as TicketIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketStatusBadge } from "../components/TicketStatusBadge";
import { TicketPriorityBadge } from "../components/TicketPriorityBadge";
import { TicketCategoryBadge } from "../components/TicketCategoryBadge";
import { useTicket } from "../hooks/useTicket";
import { formatDate } from "../utils/date";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { ticket, isLoading, isFetching, errorMessage, isNotFound, isValidId, refetch } =
    useTicket(id);

  // Loading skeleton state
  if (isLoading) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6"
        data-testid="ticket-detail-skeleton"
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-9 w-3/4 max-w-2xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="space-y-2 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Not found or invalid ID state
  if (!isValidId || isNotFound) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" data-testid="ticket-not-found">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-foreground">Ticket Not Found</h1>
            <p className="text-sm text-muted-foreground">
              {!isValidId
                ? "The ticket ID provided in the URL is invalid."
                : "The ticket you are looking for does not exist or has been removed."}
            </p>
          </div>
          <Link to="/tickets">
            <Button variant="default" size="sm" className="gap-2" data-testid="back-to-tickets-btn">
              <ArrowLeft className="h-4 w-4" />
              Back to Tickets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Generic server or network error state
  if (errorMessage && !ticket) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4" data-testid="ticket-detail-error">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-tickets"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tickets
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load ticket</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{errorMessage}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
              data-testid="retry-load-ticket"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          data-testid="back-to-tickets"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Tickets
        </Link>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 text-xs"
          data-testid="refresh-ticket-button"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

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

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content (Customer Inquiry / Message) */}
        <div className="lg:col-span-2 space-y-6">
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

        {/* Sidebar Info (Metadata & Customer Info) */}
        <div className="space-y-6">
          {/* Ticket Information Card */}
          <Card data-testid="ticket-info-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TicketIcon className="h-4 w-4 text-muted-foreground" />
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <TicketStatusBadge status={ticket.status} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Priority</span>
                <TicketPriorityBadge priority={ticket.priority} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Category</span>
                <TicketCategoryBadge category={ticket.category} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Assigned To</span>
                {ticket.assignedTo ? (
                  <div className="flex items-center gap-1.5 text-foreground font-medium" data-testid="assigned-agent-name">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{ticket.assignedTo.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic" data-testid="assigned-agent-unassigned">
                    Unassigned
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground font-medium" data-testid="ticket-created-at">
                  {formatDate(ticket.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="text-foreground font-medium" data-testid="ticket-updated-at">
                  {formatDate(ticket.updatedAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information Card */}
          <Card data-testid="ticket-customer-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block">Customer Name</span>
                <p className="text-foreground font-medium">{ticket.senderName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block">Customer Email</span>
                <a
                  href={`mailto:${ticket.senderEmail}`}
                  className="text-primary hover:underline font-medium break-all flex items-center gap-1"
                >
                  <Mail className="h-3 w-3 inline" />
                  {ticket.senderEmail}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default TicketDetailPage;
