import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { StatusFilter, CategoryFilter, PriorityFilter, SortFilter } from "../types";

interface TicketsFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (category: CategoryFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (priority: PriorityFilter) => void;
  sortFilter: SortFilter;
  onSortFilterChange: (sort: SortFilter) => void;
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
}

export function TicketsFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortFilter,
  onSortFilterChange,
  totalCount,
  openCount,
  resolvedCount,
  closedCount,
}: TicketsFilterProps) {
  return (
    <div className="space-y-3" data-testid="tickets-filter">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search tickets by subject, sender, or content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="tickets-search-input"
          />
        </div>

        {/* Category, Priority & Sort Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="category-select" className="text-xs font-medium text-muted-foreground">
              Category:
            </label>
            <select
              id="category-select"
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value as CategoryFilter)}
              className="h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              data-testid="tickets-category-select"
            >
              <option value="ALL">All Categories</option>
              <option value="GENERAL_QUESTION">General Question</option>
              <option value="TECHNICAL_QUESTION">Technical Question</option>
              <option value="REFUND_REQUEST">Refund Request</option>
              <option value="UNCATEGORIZED">Uncategorized</option>
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="priority-select" className="text-xs font-medium text-muted-foreground">
              Priority:
            </label>
            <select
              id="priority-select"
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value as PriorityFilter)}
              className="h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              data-testid="tickets-priority-select"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              id="sort-select"
              value={sortFilter}
              onChange={(e) => onSortFilterChange(e.target.value as SortFilter)}
              className="h-8 rounded-md border border-input bg-card px-2.5 py-1 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              data-testid="tickets-sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border w-fit overflow-x-auto">
        <button
          type="button"
          onClick={() => onStatusFilterChange("ALL")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            statusFilter === "ALL"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="status-filter-all"
        >
          All ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("OPEN")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            statusFilter === "OPEN"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="status-filter-open"
        >
          Open ({openCount})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("RESOLVED")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            statusFilter === "RESOLVED"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="status-filter-resolved"
        >
          Resolved ({resolvedCount})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("CLOSED")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
            statusFilter === "CLOSED"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="status-filter-closed"
        >
          Closed ({closedCount})
        </button>
      </div>
    </div>
  );
}
