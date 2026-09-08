import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useMemo } from "react";
import { getTickets, type GetTicketsResult } from "../api/tickets.api";
import type { TicketFilters } from "../types";

export function useTickets(filters?: TicketFilters) {
  const query = useQuery<GetTicketsResult, Error>({
    queryKey: ["tickets", filters],
    queryFn: () => getTickets(filters),
  });

  const errorMessage = useMemo(() => {
    if (!query.error) return null;
    if (axios.isAxiosError(query.error)) {
      if (query.error.response?.status === 401) {
        return "You must be signed in to view tickets.";
      }
      return (
        query.error.response?.data?.error ||
        query.error.message ||
        "Failed to load tickets"
      );
    }
    return query.error.message || "Failed to load tickets";
  }, [query.error]);

  return {
    ...query,
    tickets: query.data?.tickets ?? [],
    counts: query.data?.counts,
    errorMessage,
  };
}
