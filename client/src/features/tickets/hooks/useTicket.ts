import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";
import { getTicketById } from "../api/tickets.api";
import type { TicketItem } from "../types";

export function useTicket(id: number | string | undefined) {
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;
  const isValidId = typeof numericId === "number" && !isNaN(numericId) && numericId > 0;

  const query = useQuery<TicketItem, Error>({
    queryKey: ["tickets", numericId],
    queryFn: () => getTicketById(numericId!),
    enabled: isValidId,
  });

  const errorMessage = useMemo(() => {
    if (!isValidId && id !== undefined) {
      return "Invalid ticket ID";
    }
    if (!query.error) return null;
    if (axios.isAxiosError(query.error)) {
      if (query.error.response?.status === 404) {
        return "Ticket not found";
      }
      if (query.error.response?.status === 401) {
        return "You must be signed in to view this ticket.";
      }
      return (
        query.error.response?.data?.error ||
        query.error.message ||
        "Failed to load ticket details"
      );
    }
    return query.error.message || "Failed to load ticket details";
  }, [isValidId, id, query.error]);

  const isNotFound = useMemo(() => {
    if (axios.isAxiosError(query.error) && query.error.response?.status === 404) {
      return true;
    }
    return false;
  }, [query.error]);

  return {
    ...query,
    ticket: query.data,
    isValidId,
    isNotFound,
    errorMessage,
  };
}
