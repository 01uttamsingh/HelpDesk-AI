import { useMutation } from "@tanstack/react-query";
import { summarizeTicket } from "../api/tickets.api";

export function useSummarizeTicket(ticketId: number) {
  return useMutation<{ summary: string }, Error, void>({
    mutationFn: () => summarizeTicket(ticketId),
  });
}
