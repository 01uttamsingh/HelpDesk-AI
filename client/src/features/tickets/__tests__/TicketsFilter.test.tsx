import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketsFilter } from "../components/TicketsFilter";

describe("TicketsFilter", () => {
  it("renders search input, category dropdown, sort dropdown, and status tabs", async () => {
    const user = userEvent.setup();
    const handleSearchChange = vi.fn();
    const handleStatusChange = vi.fn();
    const handleCategoryChange = vi.fn();
    const handleSortChange = vi.fn();

    render(
      <TicketsFilter
        searchQuery=""
        onSearchChange={handleSearchChange}
        statusFilter="ALL"
        onStatusFilterChange={handleStatusChange}
        categoryFilter="ALL"
        onCategoryFilterChange={handleCategoryChange}
        sortFilter="newest"
        onSortFilterChange={handleSortChange}
        totalCount={10}
        openCount={6}
        resolvedCount={3}
        closedCount={1}
      />
    );

    // 1. Search typing
    const searchInput = screen.getByTestId("tickets-search-input");
    await user.type(searchInput, "billing");
    expect(handleSearchChange).toHaveBeenCalled();

    // 2. Status tabs
    const openTab = screen.getByTestId("status-filter-open");
    expect(openTab).toHaveTextContent("Open (6)");
    await user.click(openTab);
    expect(handleStatusChange).toHaveBeenCalledWith("OPEN");

    // 3. Category select
    const categorySelect = screen.getByTestId("tickets-category-select");
    await user.selectOptions(categorySelect, "TECHNICAL_QUESTION");
    expect(handleCategoryChange).toHaveBeenCalledWith("TECHNICAL_QUESTION");

    // 4. Sort select
    const sortSelect = screen.getByTestId("tickets-sort-select");
    await user.selectOptions(sortSelect, "oldest");
    expect(handleSortChange).toHaveBeenCalledWith("oldest");
  });
});
