import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketsPage } from "../pages/TicketsPage";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/renderWithQuery";
import type { TicketItem } from "../types";

const mockTickets: TicketItem[] = [
  {
    id: 101,
    subject: "React 19 Setup Issue",
    body: "I am having trouble configuring Vite with React 19.",
    senderName: "Carlos Student",
    senderEmail: "carlos@example.com",
    status: "OPEN",
    priority: "HIGH",
    category: "TECHNICAL_QUESTION",
    createdAt: "2026-09-07T14:00:00.000Z",
    updatedAt: "2026-09-07T14:00:00.000Z",
  },
  {
    id: 102,
    subject: "Refund Policy Question",
    body: "Can I get a refund for the course?",
    senderName: "Diana Student",
    senderEmail: "diana@example.com",
    status: "RESOLVED",
    priority: "MEDIUM",
    category: "REFUND_REQUEST",
    createdAt: "2026-09-07T15:00:00.000Z",
    updatedAt: "2026-09-07T15:00:00.000Z",
  },
  {
    id: 103,
    subject: "General Question on Curriculum",
    body: "Where can I find the lesson slides?",
    senderName: "Evan Student",
    senderEmail: "evan@example.com",
    status: "CLOSED",
    priority: "LOW",
    category: null,
    createdAt: "2026-09-07T16:00:00.000Z",
    updatedAt: "2026-09-07T16:00:00.000Z",
  },
];

const newestFirstTickets: TicketItem[] = [
  mockTickets[2], // 103 (16:00)
  mockTickets[1], // 102 (15:00)
  mockTickets[0], // 101 (14:00)
];

const oldestFirstTickets: TicketItem[] = [
  mockTickets[0], // 101 (14:00)
  mockTickets[1], // 102 (15:00)
  mockTickets[2], // 103 (16:00)
];

const mockGetTicketsImplementation = (_url: string, config?: any) => {
  const params = config?.params as Record<string, any> | undefined;
  let result = [...mockTickets];

  if (params?.status) {
    result = result.filter((t) => t.status === params.status);
  }
  if (params?.category) {
    if (params.category === "UNCATEGORIZED") {
      result = result.filter((t) => !t.category);
    } else {
      result = result.filter((t) => t.category === params.category);
    }
  }
  if (params?.priority) {
    result = result.filter((t) => t.priority === params.priority);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.senderName.toLowerCase().includes(q) ||
        t.senderEmail.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q)
    );
  }
  if (params?.sortBy === "priority") {
    result.sort((a, b) => a.priority.localeCompare(b.priority));
  } else if (params?.sortOrder === "asc" || params?.sort === "oldest") {
    result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return Promise.resolve({
    data: {
      success: true,
      data: result,
      counts: {
        total: mockTickets.length,
        open: mockTickets.filter((t) => t.status === "OPEN").length,
        resolved: mockTickets.filter((t) => t.status === "RESOLVED").length,
        closed: mockTickets.filter((t) => t.status === "CLOSED").length,
      },
    },
  });
};

describe("TicketsPage Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("renders tickets sorted newest first and displays metrics", async () => {
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: { success: true, data: newestFirstTickets },
    });

    renderWithQuery(<TicketsPage />);

    // Skeletons during loading
    expect(screen.getAllByTestId("ticket-skeleton-row").length).toBeGreaterThan(0);

    // Wait for tickets to load
    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
      expect(screen.getByText("Refund Policy Question")).toBeInTheDocument();
      expect(screen.getByText("General Question on Curriculum")).toBeInTheDocument();
    });

    // Verify newest first: Ticket #103 (16:00), then #102 (15:00), then #101 (14:00)
    const rows = screen.getAllByTestId(/^ticket-row-/);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveAttribute("data-testid", "ticket-row-103");
    expect(rows[1]).toHaveAttribute("data-testid", "ticket-row-102");
    expect(rows[2]).toHaveAttribute("data-testid", "ticket-row-101");

    // Check stats cards
    expect(screen.getByText("Total Tickets")).toBeInTheDocument();
    expect(screen.getByText("Open (1)")).toBeInTheDocument();
    expect(screen.getByText("Resolved (1)")).toBeInTheDocument();
    expect(screen.getByText("Closed (1)")).toBeInTheDocument();
  });

  it("filters tickets by search query across subject, sender, and content", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(api, "get").mockImplementation(mockGetTicketsImplementation);

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("tickets-search-input");
    await user.type(searchInput, "carlos");

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ search: "carlos" }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
      expect(screen.queryByText("Refund Policy Question")).not.toBeInTheDocument();
      expect(screen.queryByText("General Question on Curriculum")).not.toBeInTheDocument();
    });
  });

  it("displays empty state when search matches nothing and allows clearing filters", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "get").mockImplementation(mockGetTicketsImplementation);

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("tickets-search-input");
    await user.type(searchInput, "nonexistent-query-xyz");

    await waitFor(() => {
      expect(screen.getByText("No matching tickets found")).toBeInTheDocument();
    });

    const clearBtn = screen.getByTestId("clear-filters-button");
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);

    // Resets search and restores all tickets
    await waitFor(() => {
      expect(searchInput).toHaveValue("");
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
      expect(screen.getByText("Refund Policy Question")).toBeInTheDocument();
    });
  });

  it("filters tickets by status tabs", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(api, "get").mockImplementation(mockGetTicketsImplementation);

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
    });

    // 1. Filter by OPEN
    const openTab = screen.getByTestId("status-filter-open");
    await user.click(openTab);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ status: "OPEN" }),
        })
      );
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
      expect(screen.queryByText("Refund Policy Question")).not.toBeInTheDocument();
    });

    // 2. Filter by RESOLVED
    const resolvedTab = screen.getByTestId("status-filter-resolved");
    await user.click(resolvedTab);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ status: "RESOLVED" }),
        })
      );
      expect(screen.getByText("Refund Policy Question")).toBeInTheDocument();
      expect(screen.queryByText("React 19 Setup Issue")).not.toBeInTheDocument();
    });

    // 3. Filter by CLOSED
    const closedTab = screen.getByTestId("status-filter-closed");
    await user.click(closedTab);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ status: "CLOSED" }),
        })
      );
      expect(screen.getByText("General Question on Curriculum")).toBeInTheDocument();
    });

    // 4. Return to ALL
    const allTab = screen.getByTestId("status-filter-all");
    await user.click(allTab);

    await waitFor(() => {
      expect(screen.getAllByTestId(/^ticket-row-/)).toHaveLength(3);
    });
  });

  it("filters tickets by category dropdown", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(api, "get").mockImplementation(mockGetTicketsImplementation);

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
    });

    const categorySelect = screen.getByTestId("tickets-category-select");

    // Filter by TECHNICAL_QUESTION
    await user.selectOptions(categorySelect, "TECHNICAL_QUESTION");
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ category: "TECHNICAL_QUESTION" }),
        })
      );
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
      expect(screen.queryByText("Refund Policy Question")).not.toBeInTheDocument();
    });

    // Filter by REFUND_REQUEST
    await user.selectOptions(categorySelect, "REFUND_REQUEST");
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ category: "REFUND_REQUEST" }),
        })
      );
      expect(screen.getByText("Refund Policy Question")).toBeInTheDocument();
      expect(screen.queryByText("React 19 Setup Issue")).not.toBeInTheDocument();
    });

    // Filter by UNCATEGORIZED
    await user.selectOptions(categorySelect, "UNCATEGORIZED");
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ category: "UNCATEGORIZED" }),
        })
      );
      expect(screen.getByText("General Question on Curriculum")).toBeInTheDocument();
      expect(screen.queryByText("React 19 Setup Issue")).not.toBeInTheDocument();
    });
  });

  it("filters tickets by priority dropdown", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(api, "get").mockImplementation(mockGetTicketsImplementation);

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
    });

    const prioritySelect = screen.getByTestId("tickets-priority-select");

    // Filter by HIGH
    await user.selectOptions(prioritySelect, "HIGH");
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ priority: "HIGH" }),
        })
      );
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
      expect(screen.queryByText("Refund Policy Question")).not.toBeInTheDocument();
      expect(screen.queryByText("General Question on Curriculum")).not.toBeInTheDocument();
    });

    // Filter by MEDIUM
    await user.selectOptions(prioritySelect, "MEDIUM");
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({ priority: "MEDIUM" }),
        })
      );
      expect(screen.getByText("Refund Policy Question")).toBeInTheDocument();
      expect(screen.queryByText("React 19 Setup Issue")).not.toBeInTheDocument();
    });
  });

  it("toggles sort order between newest first and oldest first", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(api, "get").mockImplementation((_url, config) => {
      const params = config?.params as Record<string, any> | undefined;
      const isOldest =
        params?.sortOrder === "asc" || params?.sort === "oldest";
      return Promise.resolve({
        data: {
          success: true,
          data: isOldest ? oldestFirstTickets : newestFirstTickets,
        },
      });
    });

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
    });

    // Default newest first: #103 (16:00), #102 (15:00), #101 (14:00)
    let rows = screen.getAllByTestId(/^ticket-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "ticket-row-103");
    expect(rows[2]).toHaveAttribute("data-testid", "ticket-row-101");

    // Switch to oldest first
    const sortSelect = screen.getByTestId("tickets-sort-select");
    await user.selectOptions(sortSelect, "oldest");

    // Oldest first: #101 (14:00) first, #103 (16:00) last
    await waitFor(() => {
      rows = screen.getAllByTestId(/^ticket-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "ticket-row-101");
      expect(rows[2]).toHaveAttribute("data-testid", "ticket-row-103");
    });

    expect(getSpy).toHaveBeenCalledWith(
      "/api/tickets",
      expect.objectContaining({
        params: expect.objectContaining({
          sortBy: "createdAt",
          sortOrder: "asc",
        }),
      })
    );
  });

  it("sorts tickets on the server when clicking a TanStack Table column header", async () => {
    const user = userEvent.setup();
    const prioritySortedTickets = [
      mockTickets[2], // LOW (#103)
      mockTickets[1], // MEDIUM (#102)
      mockTickets[0], // HIGH (#101)
    ];

    const getSpy = vi.spyOn(api, "get").mockImplementation((_url, config) => {
      const params = config?.params as Record<string, any> | undefined;
      if (params?.sortBy === "priority") {
        return Promise.resolve({
          data: { success: true, data: prioritySortedTickets },
        });
      }
      return Promise.resolve({
        data: { success: true, data: newestFirstTickets },
      });
    });

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
    });

    // Click Priority column header to trigger sorting
    const priorityHeader = screen.getByTestId("sort-header-priority");
    await user.click(priorityHeader);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/api/tickets",
        expect.objectContaining({
          params: expect.objectContaining({
            sortBy: "priority",
            sortOrder: "asc",
          }),
        })
      );
    });

    await waitFor(() => {
      const rows = screen.getAllByTestId(/^ticket-row-/);
      expect(rows[0]).toHaveAttribute("data-testid", "ticket-row-103");
      expect(rows[2]).toHaveAttribute("data-testid", "ticket-row-101");
    });
  });

  it("displays error alert when ticket query fails", async () => {
    vi.spyOn(api, "get").mockRejectedValueOnce(new Error("Network Error"));

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("tickets-error-alert")).toBeInTheDocument();
      expect(screen.getByText("Network Error")).toBeInTheDocument();
    });
  });

  it("refetches tickets when clicking the Refresh button", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: { success: true, data: mockTickets },
    });

    renderWithQuery(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText("React 19 Setup Issue")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTestId("refresh-tickets-button");
    await user.click(refreshBtn);

    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
