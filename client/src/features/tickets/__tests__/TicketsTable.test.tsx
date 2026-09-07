import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketsTable } from "../components/TicketsTable";
import type { TicketItem } from "../types";

const mockTickets: TicketItem[] = [
  {
    id: 2,
    subject: "Newer Ticket",
    body: "This is the newer ticket content",
    senderName: "Bob Smith",
    senderEmail: "bob@example.com",
    status: "OPEN",
    priority: "HIGH",
    category: "TECHNICAL_QUESTION",
    createdAt: "2026-09-07T12:00:00.000Z",
    updatedAt: "2026-09-07T12:00:00.000Z",
  },
  {
    id: 1,
    subject: "Older Ticket",
    body: "This is the older ticket content",
    senderName: "Alice Doe",
    senderEmail: "alice@example.com",
    status: "RESOLVED",
    priority: "MEDIUM",
    category: null,
    createdAt: "2026-09-07T10:00:00.000Z",
    updatedAt: "2026-09-07T10:00:00.000Z",
  },
];

describe("TicketsTable", () => {
  it("renders tickets list ordered as provided (newest first)", () => {
    render(
      <TicketsTable
        tickets={mockTickets}
        isLoading={false}
        searchQuery=""
        hasActiveFilters={false}
        onClearFilters={vi.fn()}
      />
    );

    const rows = screen.getAllByTestId(/^ticket-row-/);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-testid", "ticket-row-2");
    expect(rows[1]).toHaveAttribute("data-testid", "ticket-row-1");

    expect(screen.getByText("Newer Ticket")).toBeInTheDocument();
    expect(screen.getByText("Older Ticket")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Technical Question")).toBeInTheDocument();
    expect(screen.getByText("Uncategorized")).toBeInTheDocument();
  });

  it("renders skeleton rows when loading", () => {
    render(
      <TicketsTable
        tickets={[]}
        isLoading={true}
        searchQuery=""
        hasActiveFilters={false}
        onClearFilters={vi.fn()}
      />
    );

    const skeletons = screen.getAllByTestId("ticket-skeleton-row");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("No tickets yet")).not.toBeInTheDocument();
  });

  it("renders empty state when no tickets exist", () => {
    render(
      <TicketsTable
        tickets={[]}
        isLoading={false}
        searchQuery=""
        hasActiveFilters={false}
        onClearFilters={vi.fn()}
      />
    );

    expect(screen.getByText("No tickets yet")).toBeInTheDocument();
    expect(screen.queryByTestId("clear-filters-button")).not.toBeInTheDocument();
  });

  it("renders filter empty state with clear button when filters are active", async () => {
    const user = userEvent.setup();
    const handleClear = vi.fn();

    render(
      <TicketsTable
        tickets={[]}
        isLoading={false}
        searchQuery="nonexistent"
        hasActiveFilters={true}
        onClearFilters={handleClear}
      />
    );

    expect(screen.getByText("No matching tickets found")).toBeInTheDocument();
    const clearBtn = screen.getByTestId("clear-filters-button");
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("renders sortable column headers with appropriate sort indicators", () => {
    render(
      <TicketsTable
        tickets={mockTickets}
        isLoading={false}
        searchQuery=""
        hasActiveFilters={false}
        onClearFilters={vi.fn()}
        sorting={[{ id: "createdAt", desc: true }]}
        onSortingChange={vi.fn()}
      />
    );

    // Created is sorted descending
    expect(screen.getByTestId("sort-header-createdAt")).toBeInTheDocument();
    expect(screen.getByTestId("sort-desc-createdAt")).toBeInTheDocument();

    // Priority is unsorted
    expect(screen.getByTestId("sort-header-priority")).toBeInTheDocument();
    expect(screen.getByTestId("sort-none-priority")).toBeInTheDocument();

    // Subject (Ticket) is unsorted
    expect(screen.getByTestId("sort-header-subject")).toBeInTheDocument();
    expect(screen.getByTestId("sort-none-subject")).toBeInTheDocument();
  });

  it("renders ascending sort indicator when column is sorted asc", () => {
    render(
      <TicketsTable
        tickets={mockTickets}
        isLoading={false}
        searchQuery=""
        hasActiveFilters={false}
        onClearFilters={vi.fn()}
        sorting={[{ id: "priority", desc: false }]}
        onSortingChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("sort-asc-priority")).toBeInTheDocument();
  });

  it("calls onSortingChange when a column header is clicked", async () => {
    const user = userEvent.setup();
    const handleSortingChange = vi.fn();

    render(
      <TicketsTable
        tickets={mockTickets}
        isLoading={false}
        searchQuery=""
        hasActiveFilters={false}
        onClearFilters={vi.fn()}
        sorting={[{ id: "createdAt", desc: true }]}
        onSortingChange={handleSortingChange}
      />
    );

    const priorityHeader = screen.getByTestId("sort-header-priority");
    await user.click(priorityHeader);

    expect(handleSortingChange).toHaveBeenCalledTimes(1);
  });
});
