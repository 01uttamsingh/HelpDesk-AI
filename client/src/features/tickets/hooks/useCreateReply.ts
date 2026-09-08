import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTicketReply } from "../api/tickets.api";
import type { TicketItem, TicketReplyItem, TicketStatus } from "../types";

export interface CreateReplyVariables {
  body: string;
  status?: TicketStatus;
}

export function useCreateReply(ticketId: number) {
  const queryClient = useQueryClient();

  return useMutation<TicketReplyItem, Error, CreateReplyVariables>({
    mutationFn: ({ body, status }: CreateReplyVariables) =>
      createTicketReply(ticketId, body, status),
    onSuccess: (newReply, variables) => {
      // Update specific ticket in cache with new reply and updated timestamp
      queryClient.setQueryData<TicketItem>(["tickets", ticketId], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: variables.status ?? prev.status,
          updatedAt: newReply.createdAt,
          replies: [...(prev.replies ?? []), newReply],
        };
      });

      // Refetch ticket in background to sync server state
      queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });

      // Invalidate tickets list and count queries
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "tickets" && query.queryKey[1] !== ticketId,
      });
    },
  });
}
