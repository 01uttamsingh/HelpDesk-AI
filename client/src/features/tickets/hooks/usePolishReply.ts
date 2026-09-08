import { useMutation } from "@tanstack/react-query";
import { polishTicketReply } from "../api/tickets.api";

export interface PolishReplyVariables {
  text: string;
}

export function usePolishReply(ticketId?: number) {
  return useMutation<{ polishedText: string }, Error, PolishReplyVariables>({
    mutationFn: ({ text }: PolishReplyVariables) => polishTicketReply(text, ticketId),
  });
}
