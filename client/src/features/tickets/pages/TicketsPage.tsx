import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { SortingState } from "@tanstack/react-table";
import { Ticket, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTickets } from "../hooks/useTickets";
import { TicketStatsCards } from "../components/TicketStatsCards";
import { TicketsFilter } from "../components/TicketsFilter";
import { TicketsTable } from "../components/TicketsTable";
import type {
  StatusFilter,
  CategoryFilter,
  PriorityFilter,
  SortFilter,
  TicketSortField,
  TicketSortOrder,
} from "../types";

export function TicketsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  // Debounce search query input to avoid spamming the backend API
  useEffect(() => {
    if (searchQuery === debouncedSearchQuery) {
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearchQuery]);

  // Derive sort parameters for server query
  const sortBy = (sorting[0]?.id as TicketSortField) || "createdAt";
  const sortOrder: TicketSortOrder = sorting[0]?.desc ? "desc" : "asc";

  // Derive legacy sortFilter value for the dropdown selector
  const sortFilter: SortFilter =
    sortBy === "createdAt" && !sorting[0]?.desc ? "oldest" : "newest";

  const handleSortFilterChange = (newSort: SortFilter) => {
    setSorting([{ id: "createdAt", desc: newSort === "newest" }]);
    setPage(1);
  };

  const handleStatusFilterChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleCategoryFilterChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setPage(1);
  };

  const handlePriorityFilterChange = (priority: PriorityFilter) => {
    setPriorityFilter(priority);
    setPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const { tickets, pagination, counts, isLoading, isFetching, errorMessage, refetch } = useTickets({
    status: statusFilter,
    category: categoryFilter,
    priority: priorityFilter,
    search: debouncedSearchQuery,
    sortBy,
    sortOrder,
    page,
    pageSize,
  });

  // Ticket counts across whole dataset (from server, with fallback)
  const totalCount = counts?.total ?? tickets.length;
  const openCount = counts?.open ?? tickets.filter((t) => t.status === "OPEN").length;
  const resolvedCount = counts?.resolved ?? tickets.filter((t) => t.status === "RESOLVED").length;
  const closedCount = counts?.closed ?? tickets.filter((t) => t.status === "CLOSED").length;

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    sortBy !== "createdAt" ||
    !sorting[0]?.desc ||
    page > 1;

  const handleClearFilters = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setPriorityFilter("ALL");
    setSorting([{ id: "createdAt", desc: true }]);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary border border-primary/20 shrink-0 shadow-xs">
              <Ticket className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Tickets
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage incoming student support inquiries and email tickets.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs sm:text-sm border-border/70 hover:bg-muted/50 shadow-xs cursor-pointer"
            data-testid="refresh-tickets-button"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-muted-foreground ${
                isFetching ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive" data-testid="tickets-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load tickets</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Metrics / Stats Cards */}
      <TicketStatsCards
        totalCount={totalCount}
        openCount={openCount}
        resolvedCount={resolvedCount}
        closedCount={closedCount}
        isLoading={isLoading}
      />

      {/* Filter and Search Bar */}
      <TicketsFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={handleCategoryFilterChange}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={handlePriorityFilterChange}
        sortFilter={sortFilter}
        onSortFilterChange={handleSortFilterChange}
        totalCount={totalCount}
        openCount={openCount}
        resolvedCount={resolvedCount}
        closedCount={closedCount}
      />

      {/* Tickets Table */}
      <TicketsTable
        tickets={tickets}
        isLoading={isLoading}
        searchQuery={searchQuery}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onSelectTicket={(ticket) => navigate(`/tickets/${ticket.id}`)}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}

export default TicketsPage;
