import { useMutation } from "@tanstack/react-query";
import { polishTicketReply } from "../api/tickets.api";

export interface PolishReplyVariables {
  text: string;
  agentName?: string;
  customerName?: string;
}

export function usePolishReply(ticketId?: number) {
  return useMutation<{ polishedText: string }, Error, PolishReplyVariables>({
    mutationFn: ({ text, agentName, customerName }: PolishReplyVariables) =>
      polishTicketReply(text, ticketId, agentName, customerName),
  });
}
