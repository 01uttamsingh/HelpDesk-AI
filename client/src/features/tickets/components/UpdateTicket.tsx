import { RefreshCw, Mail, User, Ticket as TicketIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";
import { useAssignTicket, useAssignableUsers } from "../hooks/useAssignTicket";
import { useUpdateTicket } from "../hooks/useUpdateTicket";
import type {
  TicketItem,
  TicketStatus,
  TicketCategory,
  TicketAssignedUser,
} from "../types";
import type { UpdateTicketInput } from "../api/tickets.api";
import { formatDate } from "../utils/date";

export interface UpdateTicketProps {
  ticket: TicketItem;
  assignees?: TicketAssignedUser[];
  isLoadingAssignees?: boolean;
  isUpdating?: boolean;
  updateVariables?: UpdateTicketInput;
  updateError?: Error | null;
  onUpdateTicket?: (data: UpdateTicketInput) => void;
  isAssigning?: boolean;
  assignError?: Error | null;
  onAssignTicket?: (assigneeId: string | null) => void;
}

export function UpdateTicket({
  ticket,
  assignees: propAssignees,
  isLoadingAssignees: propIsLoadingAssignees,
  isUpdating: propIsUpdating,
  updateVariables: propUpdateVariables,
  updateError: propUpdateError,
  onUpdateTicket,
  isAssigning: propIsAssigning,
  assignError: propAssignError,
  onAssignTicket,
}: UpdateTicketProps) {
  // If props are passed from parent, use them; otherwise fallback to local hooks
  const hookAssignable = useAssignableUsers();
  const hookAssign = useAssignTicket(ticket.id);
  const hookUpdate = useUpdateTicket(ticket.id);

  const assignees = propAssignees ?? hookAssignable.data ?? [];
  const isLoadingAssignees = propIsLoadingAssignees ?? hookAssignable.isLoading;
  const isUpdating = propIsUpdating ?? hookUpdate.isPending;
  const updateError = propUpdateError !== undefined ? propUpdateError : hookUpdate.error;
  const updateVariables =
    propUpdateVariables !== undefined ? propUpdateVariables : hookUpdate.variables;
  const isAssigning = propIsAssigning ?? hookAssign.isPending;
  const assignError = propAssignError !== undefined ? propAssignError : hookAssign.error;

  const handleUpdate = onUpdateTicket ?? hookUpdate.mutate;
  const handleAssign = onAssignTicket ?? hookAssign.mutate;
  const safeAssignees = Array.isArray(assignees) ? assignees : [];

  return (
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
          {/* Status Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Status</span>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="ticket-status-select" className="sr-only">
                Change Status
              </label>
              <select
                id="ticket-status-select"
                aria-label="Change ticket status"
                value={ticket.status}
                onChange={(e) => {
                  handleUpdate({ status: e.target.value as TicketStatus });
                }}
                disabled={isUpdating}
                className="w-full h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="status-select"
              >
                {ticket.status === "NEW" && <option value="NEW">New</option>}
                {ticket.status === "PROCESSING" && <option value="PROCESSING">Processing</option>}
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              {isUpdating && updateVariables?.status && (
                <RefreshCw
                  className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0"
                  data-testid="status-updating-spinner"
                />
              )}
            </div>
          </div>

          {/* Priority Section */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <span className="text-muted-foreground font-medium">Priority</span>
            <TicketPriorityBadge priority={ticket.priority} />
          </div>

          {/* Category Section */}
          <div className="pt-2 border-t border-border/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Category</span>
              <TicketCategoryBadge category={ticket.category} />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="ticket-category-select" className="sr-only">
                Change Category
              </label>
              <select
                id="ticket-category-select"
                aria-label="Change ticket category"
                value={ticket.category || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleUpdate({
                    category: val === "" ? null : (val as TicketCategory),
                  });
                }}
                disabled={isUpdating}
                className="w-full h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="category-select"
              >
                <option value="">Uncategorized</option>
                <option value="GENERAL_QUESTION">General Question</option>
                <option value="TECHNICAL_QUESTION">Technical Question</option>
                <option value="REFUND_REQUEST">Refund Request</option>
              </select>
              {isUpdating && updateVariables?.category !== undefined && (
                <RefreshCw
                  className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0"
                  data-testid="category-updating-spinner"
                />
              )}
            </div>
            {updateError && (
              <p
                className="text-[11px] text-destructive font-medium"
                data-testid="ticket-update-error"
              >
                Failed to update ticket.
              </p>
            )}
          </div>

          {/* Assignee Section */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assigned To</span>
              {ticket.assignedTo ? (
                <div
                  className="flex items-center gap-1.5 text-foreground font-medium"
                  data-testid="assigned-agent-name"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{ticket.assignedTo.name}</span>
                </div>
              ) : (
                <span
                  className="text-muted-foreground italic"
                  data-testid="assigned-agent-unassigned"
                >
                  Unassigned
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="ticket-assignee-select" className="sr-only">
                Assign Agent
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="ticket-assignee-select"
                  aria-label="Assign ticket to an agent"
                  value={ticket.assignedToId || ""}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    handleAssign(nextId === "" ? null : nextId);
                  }}
                  disabled={isAssigning || isLoadingAssignees}
                  className="w-full h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="assignee-select"
                >
                  <option value="">Unassigned</option>
                  {safeAssignees.map((agent) => (
                    <option
                      key={agent.id}
                      value={agent.id}
                      data-testid={`assignee-option-${agent.id}`}
                    >
                      {agent.name} {agent.role === "ADMIN" ? "(Admin)" : "(Agent)"}
                    </option>
                  ))}
                </select>
                {isAssigning && (
                  <RefreshCw
                    className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0"
                    data-testid="assigning-spinner"
                  />
                )}
              </div>
              {assignError && (
                <p
                  className="text-[11px] text-destructive font-medium"
                  data-testid="assign-error-message"
                >
                  Failed to update assignment.
                </p>
              )}
            </div>
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
  );
}
