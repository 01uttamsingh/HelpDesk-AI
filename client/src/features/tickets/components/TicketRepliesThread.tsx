import { Clock, MessageSquare, User, Bot } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TicketItem, TicketReplyItem } from "../types";
import { formatDate } from "../utils/date";

interface TicketRepliesThreadProps {
  ticket: TicketItem;
  replies?: TicketReplyItem[];
}

export function TicketRepliesThread({
  ticket,
  replies = [],
}: TicketRepliesThreadProps) {
  const safeReplies = Array.isArray(replies) ? replies : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span>Conversation Thread ({safeReplies.length})</span>
      </div>

      {safeReplies.length === 0 ? (
        <Card className="border-dashed" data-testid="no-replies-message">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MessageSquare className="h-5 w-5 stroke-[1.5]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">No replies yet</p>
              <p className="text-xs text-muted-foreground">
                Use the form below to post the first reply to this ticket.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4" data-testid="replies-thread">
          {safeReplies.map((reply) => {
            const isAgent = reply.senderType === "AGENT";
            const isCustomer = reply.senderType === "CUSTOMER";
            const isAi = reply.senderType === "AI";

            const authorName = isCustomer
              ? ticket.senderName
              : isAi
              ? "AI Assistant"
              : reply.user?.name || "Support Agent";

            const authorEmail = isCustomer
              ? ticket.senderEmail
              : isAi
              ? null
              : reply.user?.email || null;

            const initial = authorName ? authorName.charAt(0).toUpperCase() : "?";

            return (
              <Card
                key={reply.id}
                data-testid={`reply-item-${reply.id}`}
                className={
                  isAgent
                    ? "border-border/80 bg-card shadow-xs"
                    : isAi
                    ? "border-primary/30 bg-primary/5 shadow-xs"
                    : "border-border/80 bg-muted/20 shadow-xs"
                }
              >
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3.5 sm:p-6 pb-2.5 sm:pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full font-semibold text-xs border ${
                        isAgent
                          ? "bg-primary/10 text-primary border-primary/20"
                          : isAi
                          ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {isAi ? <Bot className="h-4 w-4" /> : isCustomer ? <User className="h-4 w-4" /> : initial}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span
                          className="font-semibold text-foreground text-sm truncate"
                          data-testid={`reply-author-${reply.id}`}
                        >
                          {authorName}
                        </span>

                        {isAgent && (
                          <Badge
                            variant={reply.user?.role === "ADMIN" ? "admin" : "agent"}
                            className="text-[10px] px-1.5 py-0"
                            data-testid={`reply-role-badge-${reply.id}`}
                          >
                            {reply.user?.role === "ADMIN" ? "Admin" : "Agent"}
                          </Badge>
                        )}

                        {isCustomer && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                            data-testid={`reply-role-badge-${reply.id}`}
                          >
                            Customer
                          </Badge>
                        )}

                        {isAi && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                            data-testid={`reply-role-badge-${reply.id}`}
                          >
                            AI
                          </Badge>
                        )}
                      </div>

                      {authorEmail && (
                        <span className="text-xs text-muted-foreground block truncate">
                          {authorEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap self-start sm:self-auto shrink-0"
                    data-testid={`reply-timestamp-${reply.id}`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <time dateTime={String(reply.createdAt)}>
                      {formatDate(String(reply.createdAt))}
                    </time>
                  </div>
                </CardHeader>

                <CardContent className="p-3.5 sm:p-6 pt-3.5 sm:pt-4">
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-sans break-words"
                    data-testid={`reply-body-${reply.id}`}
                  >
                    {reply.body}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
