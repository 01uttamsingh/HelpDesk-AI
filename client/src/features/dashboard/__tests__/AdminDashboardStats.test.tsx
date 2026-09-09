import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDashboardStats } from "../components/AdminDashboardStats";
import type { AdminStatsData } from "../types";

function renderComponent(props: React.ComponentProps<typeof AdminDashboardStats>) {
  return render(
    <MemoryRouter>
      <AdminDashboardStats {...props} />
    </MemoryRouter>
  );
}

const mockAdminStats: AdminStatsData = {
  totalTickets: 42,
  openTickets: 15,
  resolvedTickets: 20,
  closedTickets: 7,
  aiResolvedTickets: 12,
  aiResolvedPercentage: 29,
  aiResolvedOfResolvedPercentage: 60,
  avgResolutionTimeMs: 75 * 60 * 1000,
  avgResolutionTimeFormatted: "1h 15m",
  dailyTicketCounts: [],
};

describe("AdminDashboardStats", () => {
  it("renders all 5 core KPI cards with correct data", () => {
    renderComponent({ stats: mockAdminStats, isLoading: false });

    // 1. Total Tickets
    const totalCard = screen.getByTestId("admin-total-tickets");
    expect(totalCard).toHaveTextContent("Total Tickets");
    expect(totalCard).toHaveTextContent("42");

    // 2. Open Tickets
    const openCard = screen.getByTestId("admin-open-tickets");
    expect(openCard).toHaveTextContent("Open Tickets");
    expect(openCard).toHaveTextContent("15");

    // 3. Resolved by AI
    const aiCard = screen.getByTestId("admin-ai-resolved");
    expect(aiCard).toHaveTextContent("Resolved by AI");
    expect(aiCard).toHaveTextContent("12");
    expect(aiCard).toHaveTextContent("60% of resolved tickets");

    // 4. % of tickets resolved by AI
    const percentCard = screen.getByTestId("admin-ai-percentage");
    expect(percentCard).toHaveTextContent("% Resolved by AI");
    expect(percentCard).toHaveTextContent("29%");
    expect(percentCard).toHaveTextContent("12 of 42 total tickets");

    // 5. Avg Resolution Time
    const avgCard = screen.getByTestId("admin-avg-resolution-time");
    expect(avgCard).toHaveTextContent("Avg Resolution Time");
    expect(avgCard).toHaveTextContent("1h 15m");
  });

  it("renders secondary status breakdown (Resolved and Closed counts)", () => {
    renderComponent({ stats: mockAdminStats, isLoading: false });

    expect(screen.getByText("Total Resolved")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();

    expect(screen.getByText("Total Closed")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders fallback default values when stats are undefined", () => {
    renderComponent({ stats: undefined, isLoading: false });

    const totalCard = screen.getByTestId("admin-total-tickets");
    expect(totalCard).toHaveTextContent("0");

    const openCard = screen.getByTestId("admin-open-tickets");
    expect(openCard).toHaveTextContent("0");

    const avgCard = screen.getByTestId("admin-avg-resolution-time");
    expect(avgCard).toHaveTextContent("< 1m");
  });

  it("renders skeleton placeholders when isLoading is true", () => {
    const { container } = renderComponent({ stats: undefined, isLoading: true });
    // Skeletons have class animate-pulse
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
