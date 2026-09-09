import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AgentDashboardStats } from "../components/AgentDashboardStats";
import type { AgentStatsData } from "../types";

function renderComponent(props: React.ComponentProps<typeof AgentDashboardStats>) {
  return render(
    <MemoryRouter>
      <AgentDashboardStats {...props} />
    </MemoryRouter>
  );
}

const mockAgentStats: AgentStatsData = {
  assignedTicketsCount: 8,
  assignedOpenCount: 3,
  assignedResolvedCount: 4,
  assignedClosedCount: 1,
  totalTickets: 50,
  openTickets: 12,
  resolvedTickets: 25,
  closedTickets: 13,
  recentAssignedTickets: [],
};

describe("AgentDashboardStats", () => {
  it("renders all agent workload & queue cards with correct values", () => {
    renderComponent({ stats: mockAgentStats, isLoading: false });

    // 0. Total Open Tickets (Team Queue)
    const totalOpen = screen.getByTestId("agent-total-open");
    expect(totalOpen).toHaveTextContent("Total Open Tickets");
    expect(totalOpen).toHaveTextContent("12");

    // 1. Assigned to Me
    const assignedTotal = screen.getByTestId("agent-assigned-total");
    expect(assignedTotal).toHaveTextContent("Assigned to Me");
    expect(assignedTotal).toHaveTextContent("8");

    // 2. My Open Tickets
    const assignedOpen = screen.getByTestId("agent-assigned-open");
    expect(assignedOpen).toHaveTextContent("My Open Tickets");
    expect(assignedOpen).toHaveTextContent("3");

    // 3. My Resolved
    const assignedResolved = screen.getByTestId("agent-assigned-resolved");
    expect(assignedResolved).toHaveTextContent("My Resolved");
    expect(assignedResolved).toHaveTextContent("4");

    // 4. My Closed
    const assignedClosed = screen.getByTestId("agent-assigned-closed");
    expect(assignedClosed).toHaveTextContent("My Closed");
    expect(assignedClosed).toHaveTextContent("1");
  });

  it("renders default 0s when stats are undefined", () => {
    renderComponent({ stats: undefined, isLoading: false });

    expect(screen.getByTestId("agent-total-open")).toHaveTextContent("0");
    expect(screen.getByTestId("agent-assigned-total")).toHaveTextContent("0");
    expect(screen.getByTestId("agent-assigned-open")).toHaveTextContent("0");
    expect(screen.getByTestId("agent-assigned-resolved")).toHaveTextContent("0");
    expect(screen.getByTestId("agent-assigned-closed")).toHaveTextContent("0");
  });

  it("renders skeleton state when isLoading is true", () => {
    const { container } = renderComponent({ stats: undefined, isLoading: true });
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
