import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TicketsTable } from "../components/TicketsTable";
import type { TicketItem } from "../types";

function renderTable(props: React.ComponentProps<typeof TicketsTable>) {
  return render(
    <MemoryRouter>
      <TicketsTable {...props} />
    </MemoryRouter>
  );
}

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
    renderTable({
      tickets: mockTickets,
      isLoading: false,
      searchQuery: "",
      hasActiveFilters: false,
      onClearFilters: vi.fn(),
    });

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

  it("renders ticket subjects as links pointing to /tickets/:id", () => {
    renderTable({
      tickets: mockTickets,
      isLoading: false,
      searchQuery: "",
      hasActiveFilters: false,
      onClearFilters: vi.fn(),
    });

    const link2 = screen.getByTestId("ticket-subject-2");
    expect(link2).toHaveAttribute("href", "/tickets/2");
    expect(link2).toHaveTextContent("Newer Ticket");

    const link1 = screen.getByTestId("ticket-subject-1");
    expect(link1).toHaveAttribute("href", "/tickets/1");
    expect(link1).toHaveTextContent("Older Ticket");
  });

  it("renders skeleton rows when loading", () => {
    renderTable({
      tickets: [],
      isLoading: true,
      searchQuery: "",
      hasActiveFilters: false,
      onClearFilters: vi.fn(),
    });

    const skeletons = screen.getAllByTestId("ticket-skeleton-row");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("No tickets yet")).not.toBeInTheDocument();
  });

  it("renders empty state when no tickets exist", () => {
    renderTable({
      tickets: [],
      isLoading: false,
      searchQuery: "",
      hasActiveFilters: false,
      onClearFilters: vi.fn(),
    });

    expect(screen.getByText("No tickets yet")).toBeInTheDocument();
    expect(screen.queryByTestId("clear-filters-button")).not.toBeInTheDocument();
  });

  it("renders filter empty state with clear button when filters are active", async () => {
    const user = userEvent.setup();
    const handleClear = vi.fn();

    renderTable({
      tickets: [],
      isLoading: false,
      searchQuery: "nonexistent",
      hasActiveFilters: true,
      onClearFilters: handleClear,
    });

    expect(screen.getByText("No matching tickets found")).toBeInTheDocument();
    const clearBtn = screen.getByTestId("clear-filters-button");
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("renders sortable column headers with appropriate sort indicators", () => {
    renderTable({
      tickets: mockTickets,
      isLoading: false,
      searchQuery: "",
      hasActiveFilters: false,
      onClearFilters: vi.fn(),
      sorting: [{ id: "createdAt", desc: true }],
      onSortingChange: vi.fn(),
    });

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
    renderTable({
      tickets: mockTickets,
      isLoading: false,
      searchQuery: "",
      hasActiveFilters: false,
      onClearFilters: vi.fn(),
      sorting: [{ id: "priority", desc: false }],
      onSortingChange: vi.fn(),
    });

    expect(screen.getByTestId("sort-asc-priority")).toBeInTheDocument();
  });

  it("calls onSortingChange when a column header is clicked", async () => {
    const user = userEvent.setup();
    const handleSortingChange = vi.fn();

    renderTable({
      tickets: mockTickets,
      isLoading: false,
      searchQuery: "",
      hasActiveFilters: false,
      onClearFilters: vi.fn(),
      sorting: [{ id: "createdAt", desc: true }],
      onSortingChange: handleSortingChange,
    });

    const priorityHeader = screen.getByTestId("sort-header-priority");
    await user.click(priorityHeader);

    expect(handleSortingChange).toHaveBeenCalledTimes(1);
  });

  it("renders pagination controls and triggers page change handlers", async () => {
    const user = userEvent.setup();
    const handlePageChange = vi.fn();
    const handlePageSizeChange = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <TicketsTable
          tickets={mockTickets}
          isLoading={false}
          searchQuery=""
          hasActiveFilters={false}
          onClearFilters={vi.fn()}
          pagination={{
            page: 1,
            pageSize: 10,
            totalCount: 35,
            totalPages: 4,
          }}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </MemoryRouter>
    );

    // Range display
    expect(screen.getByTestId("pagination-info")).toHaveTextContent("Showing 1 to 10 of 35 tickets");
    expect(screen.getByTestId("pagination-current-page")).toHaveTextContent("Page 1 of 4");

    // First and Prev buttons disabled on Page 1
    expect(screen.getByTestId("pagination-first")).toBeDisabled();
    expect(screen.getByTestId("pagination-prev")).toBeDisabled();

    // Next and Last buttons enabled on Page 1
    const nextBtn = screen.getByTestId("pagination-next");
    const lastBtn = screen.getByTestId("pagination-last");
    expect(nextBtn).toBeEnabled();
    expect(lastBtn).toBeEnabled();

    // Click Next -> calls onPageChange(2)
    await user.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);

    // Click Last -> calls onPageChange(4)
    await user.click(lastBtn);
    expect(handlePageChange).toHaveBeenCalledWith(4);

    // Page size dropdown change
    const pageSizeSelect = screen.getByTestId("pagination-page-size-select");
    await user.selectOptions(pageSizeSelect, "20");
    expect(handlePageSizeChange).toHaveBeenCalledWith(20);

    // Re-render on last page (Page 4 of 4)
    rerender(
      <MemoryRouter>
        <TicketsTable
          tickets={mockTickets}
          isLoading={false}
          searchQuery=""
          hasActiveFilters={false}
          onClearFilters={vi.fn()}
          pagination={{
            page: 4,
            pageSize: 10,
            totalCount: 35,
            totalPages: 4,
          }}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId("pagination-info")).toHaveTextContent("Showing 31 to 35 of 35 tickets");
    expect(screen.getByTestId("pagination-next")).toBeDisabled();
    expect(screen.getByTestId("pagination-last")).toBeDisabled();
    expect(screen.getByTestId("pagination-prev")).toBeEnabled();
    expect(screen.getByTestId("pagination-first")).toBeEnabled();
  });
});
