import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignTicket, getAssignableUsers } from "../api/tickets.api";
import type { TicketItem, TicketAssignedUser } from "../types";

export function useAssignableUsers() {
  return useQuery<TicketAssignedUser[], Error>({
    queryKey: ["users", "assignees"],
    queryFn: getAssignableUsers,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useAssignTicket(ticketId: number) {
  const queryClient = useQueryClient();

  return useMutation<TicketItem, Error, string | null>({
    mutationFn: (assignedToId: string | null) => assignTicket(ticketId, assignedToId),
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
