import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import * as authModule from "@/features/auth";
import * as statsHookModule from "../hooks/useDashboardStats";
import type { DashboardStatsData } from "../types";

vi.mock("@/features/auth", () => ({
  useSession: vi.fn(),
}));

vi.mock("../hooks/useDashboardStats", () => ({
  useDashboardStats: vi.fn(),
}));

// Mock recharts ResponsiveContainer for JSDOM
vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 260 }}>{children}</div>
    ),
  };
});

const mockStatsData: DashboardStatsData = {
  role: "ADMIN",
  adminStats: {
    totalTickets: 25,
    openTickets: 5,
    resolvedTickets: 15,
    closedTickets: 5,
    aiResolvedTickets: 10,
    aiResolvedPercentage: 40,
    aiResolvedOfResolvedPercentage: 67,
    avgResolutionTimeMs: 45 * 60 * 1000,
    avgResolutionTimeFormatted: "45m",
    dailyTicketCounts: [
      { date: "2026-09-08", label: "Sep 08", count: 12 },
      { date: "2026-09-09", label: "Sep 09", count: 13 },
    ],
  },
  agentStats: {
    assignedTicketsCount: 4,
    assignedOpenCount: 2,
    assignedResolvedCount: 2,
    assignedClosedCount: 0,
    totalTickets: 25,
    openTickets: 5,
    resolvedTickets: 15,
    closedTickets: 5,
    recentAssignedTickets: [
      {
        id: 1,
        subject: "Password Reset Issue",
        body: "I forgot my master password",
        senderName: "Alice",
        senderEmail: "alice@example.com",
        status: "OPEN",
        priority: "HIGH",
        category: "TECHNICAL_QUESTION",
        createdAt: "2026-09-09T09:00:00.000Z",
        updatedAt: "2026-09-09T09:30:00.000Z",
      },
    ],
  },
};

describe("DashboardPage", () => {
  const refetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Admin View", () => {
    beforeEach(() => {
      vi.mocked(authModule.useSession).mockReturnValue({
        data: {
          user: {
            id: "admin-1",
            name: "Admin Alice",
            email: "admin@example.com",
            role: "ADMIN",
          },
        },
      } as ReturnType<typeof authModule.useSession>);

      vi.mocked(statsHookModule.useDashboardStats).mockReturnValue({
        stats: mockStatsData,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: refetchMock,
      } as ReturnType<typeof statsHookModule.useDashboardStats>);
    });

    it("renders Admin badge, Admin KPI cards, and 30-Day Volume Chart by default", () => {
      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      expect(screen.getByText("Administrator")).toBeInTheDocument();
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
      expect(screen.getByText("Admin Alice")).toBeInTheDocument();

      // Admin KPI cards
      expect(screen.getByTestId("admin-stats-cards")).toBeInTheDocument();
      expect(screen.getByTestId("admin-total-tickets")).toHaveTextContent("25");
      expect(screen.getByTestId("admin-ai-resolved")).toHaveTextContent("10");

      // 30-Day chart
      expect(screen.getByTestId("ticket-volume-chart")).toBeInTheDocument();

      // Tab switcher exists
      expect(screen.getByTestId("admin-tab-overview")).toBeInTheDocument();
      expect(screen.getByTestId("admin-tab-assigned")).toBeInTheDocument();
    });

    it("allows admin to switch to 'My Workload' tab to inspect personal tickets", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      await user.click(screen.getByTestId("admin-tab-assigned"));

      // Workload cards and recent tickets table are now visible
      expect(screen.getByTestId("agent-stats-cards")).toBeInTheDocument();
      expect(screen.getByTestId("recent-assigned-tickets-table")).toBeInTheDocument();
      expect(screen.getByText("Password Reset Issue")).toBeInTheDocument();

      // Switching back to overview
      await user.click(screen.getByTestId("admin-tab-overview"));
      expect(screen.getByTestId("admin-stats-cards")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-volume-chart")).toBeInTheDocument();
    });

    it("triggers refetch when clicking the refresh button", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      const refreshBtn = screen.getByTestId("refresh-dashboard-button");
      await user.click(refreshBtn);
      expect(refetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Agent View", () => {
    beforeEach(() => {
      vi.mocked(authModule.useSession).mockReturnValue({
        data: {
          user: {
            id: "agent-1",
            name: "Agent Bob",
            email: "bob@example.com",
            role: "AGENT",
          },
        },
      } as ReturnType<typeof authModule.useSession>);

      vi.mocked(statsHookModule.useDashboardStats).mockReturnValue({
        stats: mockStatsData,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: refetchMock,
      } as ReturnType<typeof statsHookModule.useDashboardStats>);
    });

    it("renders Support Agent badge, agent workload stats, and recent assigned tickets table directly", () => {
      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      expect(screen.getByText("Support Agent")).toBeInTheDocument();
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
      expect(screen.getByText("Agent Bob")).toBeInTheDocument();

      // Agent stats & table are displayed directly
      expect(screen.getByTestId("agent-stats-cards")).toBeInTheDocument();
      expect(screen.getByTestId("agent-assigned-total")).toHaveTextContent("4");
      expect(screen.getByTestId("recent-assigned-tickets-table")).toBeInTheDocument();

      // Admin tabs should NOT be visible
      expect(screen.queryByTestId("admin-tab-overview")).not.toBeInTheDocument();
      expect(screen.queryByTestId("ticket-volume-chart")).not.toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("renders error alert when query fails", () => {
      vi.mocked(authModule.useSession).mockReturnValue({
        data: { user: { id: "1", name: "User", role: "AGENT" } },
      } as ReturnType<typeof authModule.useSession>);

      vi.mocked(statsHookModule.useDashboardStats).mockReturnValue({
        stats: undefined,
        isLoading: false,
        isFetching: false,
        error: new Error("Network error loading metrics"),
        refetch: refetchMock,
      } as ReturnType<typeof statsHookModule.useDashboardStats>);

      render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId("dashboard-error-alert")).toBeInTheDocument();
      expect(screen.getByText("Network error loading metrics")).toBeInTheDocument();
    });
  });
});
