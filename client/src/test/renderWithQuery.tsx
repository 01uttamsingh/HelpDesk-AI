import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Creates a fresh, isolated TanStack QueryClient configured for unit/component testing
 * with retries disabled to prevent slow test runs and timeouts.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom React Testing Library render wrapper that injects TanStack QueryClientProvider.
 */
export function renderWithQuery(
  ui: ReactElement,
  client = createTestQueryClient(),
  options?: Omit<RenderOptions, "wrapper">
) {
  return {
    ...render(
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
      options
    ),
    client,
  };
}

export default renderWithQuery;
