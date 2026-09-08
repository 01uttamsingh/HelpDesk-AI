import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { TicketRepliesThread } from "../components/TicketRepliesThread";
import { TicketReplyForm } from "../components/TicketReplyForm";
import { TicketDetails } from "../components/TicketDetails";
import { UpdateTicket } from "../components/UpdateTicket";
import { TicketDetailSkeleton } from "../components/TicketDetailSkeleton";
import { BackToTicketsButton } from "../components/BackToTicketsButton";
import { useTicket } from "../hooks/useTicket";
import { useAssignTicket, useAssignableUsers } from "../hooks/useAssignTicket";
import { useUpdateTicket } from "../hooks/useUpdateTicket";

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const numericId = typeof id === "string" ? parseInt(id, 10) : undefined;
  const { ticket, isLoading, isFetching, errorMessage, isNotFound, isValidId, refetch } =
    useTicket(numericId);
  const { data: assignees = [], isLoading: isLoadingAssignees } = useAssignableUsers();
  const {
    mutate: assignTicketMutation,
    isPending: isAssigning,
    error: assignError,
  } = useAssignTicket(numericId ?? 0);
  const {
    mutate: updateTicketMutation,
    isPending: isUpdating,
    error: updateError,
    variables: updateVariables,
  } = useUpdateTicket(numericId ?? 0);
  const safeAssignees = Array.isArray(assignees) ? assignees : [];

  // Loading skeleton state
  if (isLoading) {
    return <TicketDetailSkeleton />;
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
          <BackToTicketsButton />
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

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Content (Customer Inquiry / Message) */}
        <div className="lg:col-span-2 space-y-6">
          <TicketDetails ticket={ticket} />

          {/* Conversation Thread */}
          <TicketRepliesThread ticket={ticket} replies={ticket.replies ?? []} />

          {/* Reply Form */}
          <TicketReplyForm ticketId={ticket.id} currentStatus={ticket.status} />
        </div>

        {/* Sidebar Info (Metadata & Customer Info) */}
        <UpdateTicket
          ticket={ticket}
          assignees={safeAssignees}
          isLoadingAssignees={isLoadingAssignees}
          isUpdating={isUpdating}
          updateVariables={updateVariables}
          updateError={updateError}
          onUpdateTicket={updateTicketMutation}
          isAssigning={isAssigning}
          assignError={assignError}
          onAssignTicket={assignTicketMutation}
        />
      </div>
    </div>
  );
}

export default TicketDetailPage;
