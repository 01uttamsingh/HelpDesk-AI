import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTicket, type UpdateTicketInput } from "../api/tickets.api";
import type { TicketItem } from "../types";

export function useUpdateTicket(ticketId: number) {
  const queryClient = useQueryClient();

  return useMutation<TicketItem, Error, UpdateTicketInput>({
    mutationFn: (data: UpdateTicketInput) => updateTicket(ticketId, data),
    onSuccess: (updatedTicket) => {
      // Update specific ticket in cache
      queryClient.setQueryData(["tickets", ticketId], updatedTicket);
      // Invalidate tickets list and stats queries without refetching this specific ticket
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "tickets" && query.queryKey[1] !== ticketId,
      });
    },
  });
}
