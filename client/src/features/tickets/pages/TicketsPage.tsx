import { useState, useMemo } from "react";
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
  SortFilter,
  TicketSortField,
  TicketSortOrder,
} from "../types";

export function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  // Derive sort parameters for server query
  const sortBy = (sorting[0]?.id as TicketSortField) || "createdAt";
  const sortOrder: TicketSortOrder = sorting[0]?.desc ? "desc" : "asc";

  // Derive legacy sortFilter value for the dropdown selector
  const sortFilter: SortFilter =
    sortBy === "createdAt" && !sorting[0]?.desc ? "oldest" : "newest";

  const handleSortFilterChange = (newSort: SortFilter) => {
    setSorting([{ id: "createdAt", desc: newSort === "newest" }]);
  };

  const { tickets, isLoading, isFetching, errorMessage, refetch } = useTickets({
    sortBy,
    sortOrder,
  });

  // Filter tickets (sorting is handled on the server)
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus =
        statusFilter === "ALL" || t.status === statusFilter;

      const matchesCategory =
        categoryFilter === "ALL"
          ? true
          : categoryFilter === "UNCATEGORIZED"
          ? !t.category
          : t.category === categoryFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        t.subject?.toLowerCase().includes(q) ||
        t.body?.toLowerCase().includes(q) ||
        t.senderName?.toLowerCase().includes(q) ||
        t.senderEmail?.toLowerCase().includes(q);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [tickets, statusFilter, categoryFilter, searchQuery]);

  // Ticket counts across whole dataset
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const resolvedCount = tickets.filter((t) => t.status === "RESOLVED").length;
  const closedCount = tickets.filter((t) => t.status === "CLOSED").length;

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    sortBy !== "createdAt" ||
    !sorting[0]?.desc;

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setSorting([{ id: "createdAt", desc: true }]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Ticket className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Tickets
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage incoming student support inquiries and email tickets.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
            data-testid="refresh-tickets-button"
          >
            <RefreshCw
              className={`h-4 w-4 text-muted-foreground ${
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
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        sortFilter={sortFilter}
        onSortFilterChange={handleSortFilterChange}
        totalCount={totalCount}
        openCount={openCount}
        resolvedCount={resolvedCount}
        closedCount={closedCount}
      />

      {/* Tickets Table */}
      <TicketsTable
        tickets={filteredTickets}
        isLoading={isLoading}
        searchQuery={searchQuery}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  );
}

export default TicketsPage;
