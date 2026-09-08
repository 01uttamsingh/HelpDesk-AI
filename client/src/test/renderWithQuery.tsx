import { type ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, type MemoryRouterProps } from "react-router-dom";

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

export interface RenderWithQueryOptions extends Omit<RenderOptions, "wrapper"> {
  route?: string;
  routerProps?: MemoryRouterProps;
}

/**
 * Custom React Testing Library render wrapper that injects TanStack QueryClientProvider
 * and MemoryRouter for router-aware component testing.
 */
export function renderWithQuery(
  ui: ReactElement,
  client = createTestQueryClient(),
  options?: RenderWithQueryOptions
) {
  const { route = "/", routerProps, ...renderOptions } = options ?? {};
  return {
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]} {...routerProps}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>,
      renderOptions
    ),
    client,
  };
}

export default renderWithQuery;
