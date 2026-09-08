import { useState } from "react";
import { Send, RefreshCw, AlertCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReply } from "../hooks/useCreateReply";
import type { TicketStatus } from "../types";
import { getErrorMessage } from "@/features/users/utils/error";

interface TicketReplyFormProps {
  ticketId: number;
  currentStatus?: TicketStatus;
}

export function TicketReplyForm({
  ticketId,
  currentStatus = "OPEN",
}: TicketReplyFormProps) {
  const [body, setBody] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | "">("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { mutate: sendReply, isPending, error } = useCreateReply(ticketId);

  if (currentStatus === "CLOSED") {
    return (
      <Card data-testid="ticket-closed-reply-disabled" className="border-border bg-muted/30">
        <CardContent className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border">
            <Lock className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-foreground">This ticket is closed</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              New replies cannot be added to a closed ticket. Reopen the ticket to continue the conversation.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setValidationError("Reply message cannot be empty.");
      return;
    }

    setValidationError(null);

    sendReply(
      {
        body: trimmedBody,
        status: selectedStatus === "" ? undefined : selectedStatus,
      },
      {
        onSuccess: () => {
          setBody("");
          setSelectedStatus("");
        },
      }
    );
  };

  const apiErrorMessage = error ? getErrorMessage(error, "Failed to send reply.") : null;

  return (
    <Card data-testid="ticket-reply-form-card" className="border-border">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" />
          Reply to Ticket
        </CardTitle>
        <CardDescription className="text-xs">
          Send a response to the customer. Your message will be recorded in the thread.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {apiErrorMessage && (
            <Alert variant="destructive" data-testid="reply-error-alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs font-semibold">Error</AlertTitle>
              <AlertDescription className="text-xs">{apiErrorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <label htmlFor="reply-body-input" className="sr-only">
              Reply message
            </label>
            <Textarea
              id="reply-body-input"
              data-testid="reply-body-input"
              aria-label="Reply message"
              placeholder="Type your response to the customer here..."
              rows={4}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={isPending}
              aria-invalid={!!validationError}
            />
            {validationError && (
              <p
                className="text-xs text-destructive font-medium"
                data-testid="reply-validation-error"
              >
                {validationError}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <label
                htmlFor="reply-status-select"
                className="text-xs text-muted-foreground font-medium whitespace-nowrap"
              >
                Status on reply:
              </label>
              <select
                id="reply-status-select"
                data-testid="reply-status-select"
                aria-label="Change ticket status on reply"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as TicketStatus | "")}
                disabled={isPending}
                className="h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50"
              >
                <option value="">Keep current ({currentStatus})</option>
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              className="gap-2 shrink-0"
              data-testid="submit-reply-button"
            >
              {isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Reply</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
