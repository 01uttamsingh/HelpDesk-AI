import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

/**
 * Shared QueryClient instance configured for Helpdesk application.
 * Disables automatic retries on 401/403/404 HTTP errors.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes cache validity
      gcTime: 1000 * 60 * 10,   // 10 minutes garbage collection
      retry: (failureCount, error) => {
        // Do not retry on client-side authentication or authorization errors
        if (
          axios.isAxiosError(error) &&
          error.response?.status &&
          [401, 403, 404].includes(error.response.status)
        ) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;
