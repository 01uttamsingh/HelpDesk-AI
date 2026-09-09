import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type OnChangeFn,
} from "@tanstack/react-table";
import {
  Ticket as TicketIcon,
  Inbox,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";
import { formatDate } from "../utils/date";
import type { TicketItem, PaginationMeta } from "../types";

export { formatDate };

export interface TicketsTableProps {
  tickets: TicketItem[];
  isLoading: boolean;
  searchQuery: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onSelectTicket?: (ticket: TicketItem) => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: PaginationMeta;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
}

export function TicketsTable({
  tickets,
  isLoading,
  searchQuery,
  hasActiveFilters,
  onClearFilters,
  onSelectTicket,
  sorting,
  onSortingChange,
  pagination,
  onPageChange,
  onPageSizeChange,
}: TicketsTableProps) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  const activeSorting = sorting ?? internalSorting;
  const handleSortingChange = onSortingChange ?? setInternalSorting;

  const columns = useMemo<ColumnDef<TicketItem>[]>(
    () => [
      {
        accessorKey: "subject",
        header: "Ticket",
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <TicketIcon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 max-w-xs sm:max-w-sm lg:max-w-md">
                <Link
                  to={`/tickets/${ticket.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-foreground hover:text-primary transition-colors truncate block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
                  data-testid={`ticket-subject-${ticket.id}`}
                >
                  {ticket.subject}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {ticket.body}
                </p>
              </div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "senderName",
        header: "Customer",
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-foreground">{ticket.senderName || "Unknown"}</p>
              <p className="text-[11px] text-muted-foreground">{ticket.senderEmail}</p>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
        enableSorting: true,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <TicketPriorityBadge priority={row.original.priority} />,
        enableSorting: true,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <TicketCategoryBadge category={row.original.category} />,
        enableSorting: true,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <time dateTime={row.original.createdAt} className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </time>
        ),
        enableSorting: true,
      },
    ],
    []
  );

  const displayTickets = useMemo(() => {
    return tickets.filter(
      (ticket) => ticket.status !== "NEW" && ticket.status !== "PROCESSING"
    );
  }, [tickets]);

  const table = useReactTable({
    data: displayTickets,
    columns,
    state: {
      sorting: activeSorting,
      pagination: {
        pageIndex: (pagination?.page ?? 1) - 1,
        pageSize: pagination?.pageSize ?? 10,
      },
    },
    pageCount: pagination?.totalPages ?? -1,
    onSortingChange: handleSortingChange,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="tickets-table">
          <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="py-3 px-4"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground hover:text-foreground transition-colors group cursor-pointer select-none -ml-1 px-1 py-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          data-testid={`sort-header-${header.column.id}`}
                          aria-label={`Sort by ${String(header.column.columnDef.header)}`}
                        >
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          {isSorted === "asc" ? (
                            <ArrowUp
                              className="h-3.5 w-3.5 text-foreground shrink-0"
                              data-testid={`sort-asc-${header.column.id}`}
                            />
                          ) : isSorted === "desc" ? (
                            <ArrowDown
                              className="h-3.5 w-3.5 text-foreground shrink-0"
                              data-testid={`sort-desc-${header.column.id}`}
                            />
                          ) : (
                            <ArrowUpDown
                              className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100 transition-opacity shrink-0"
                              data-testid={`sort-none-${header.column.id}`}
                            />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Skeleton loading state
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} data-testid="ticket-skeleton-row">
                  <td className="py-3 px-4">
                    <div className="flex items-start gap-2.5">
                      <Skeleton className="mt-0.5 h-6 w-6 rounded-md shrink-0" />
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Skeleton className="h-4 w-20" />
                  </td>
                </tr>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              // Ticket Rows (ordered per server response)
              table.getRowModel().rows.map((row) => {
                const ticket = row.original;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => onSelectTicket?.(ticket)}
                    className={`hover:bg-muted/30 transition-colors group ${
                      onSelectTicket ? "cursor-pointer" : ""
                    }`}
                    data-testid={`ticket-row-${ticket.id}`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isSubject = cell.column.id === "subject";
                      return (
                        <td
                          key={cell.id}
                          className={`py-3 px-4 ${
                            isSubject ? "" : "whitespace-nowrap"
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              // Empty State
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {hasActiveFilters ? "No matching tickets found" : "No tickets yet"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hasActiveFilters
                          ? `No tickets match your filters${
                              searchQuery ? ` for "${searchQuery}"` : ""
                            }. Try clearing filters.`
                          : "Inbound student support emails will automatically appear here as tickets."}
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onClearFilters}
                        data-testid="clear-filters-button"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3.5 border-t border-border bg-card text-xs text-muted-foreground"
          data-testid="tickets-pagination"
        >
          {/* Items Range Info */}
          <div className="flex items-center gap-1.5" data-testid="pagination-info">
            {pagination.totalCount === 0 ? (
              <span>Showing 0 of 0 tickets</span>
            ) : (
              <span>
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {pagination.totalCount}
                </span>{" "}
                tickets
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Page Size Selector */}
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-card px-2 py-1 text-xs font-medium text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  data-testid="pagination-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onPageChange?.(1)}
                disabled={pagination.page <= 1 || isLoading}
                title="First Page"
                data-testid="pagination-first"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">First Page</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="gap-1"
                data-testid="pagination-prev"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <span
                className="px-2 font-medium text-foreground text-xs"
                data-testid="pagination-current-page"
              >
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="gap-1"
                data-testid="pagination-next"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onPageChange?.(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                title="Last Page"
                data-testid="pagination-last"
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Last Page</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
