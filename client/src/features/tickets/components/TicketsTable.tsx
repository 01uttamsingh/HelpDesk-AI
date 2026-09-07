import { useState, useMemo } from "react";
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
  Calendar,
  User,
  Mail,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketCategoryBadge } from "./TicketCategoryBadge";
import type { TicketItem } from "../types";

export interface TicketsTableProps {
  tickets: TicketItem[];
  isLoading: boolean;
  searchQuery: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onSelectTicket?: (ticket: TicketItem) => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
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
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <TicketIcon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 max-w-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-muted-foreground">
                    #{ticket.id}
                  </span>
                  <span className="font-semibold text-foreground truncate block">
                    {ticket.subject || "(No Subject)"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
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
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground text-xs truncate max-w-[160px]">
                  {ticket.senderName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[160px]">{ticket.senderEmail}</span>
              </div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <TicketCategoryBadge category={row.original.category} />,
        enableSorting: true,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <TicketPriorityBadge priority={row.original.priority} />,
        enableSorting: true,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
        enableSorting: true,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
            <time dateTime={row.original.createdAt}>
              {formatDate(row.original.createdAt)}
            </time>
          </div>
        ),
        enableSorting: true,
      },
    ],
    []
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: {
      sorting: activeSorting,
    },
    onSortingChange: handleSortingChange,
    manualSorting: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="tickets-table">
          <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th key={header.id} scope="col" className="px-6 py-3.5">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group cursor-pointer select-none -ml-1 px-1 py-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
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
                    className={`group transition-colors hover:bg-muted/50 ${
                      onSelectTicket ? "cursor-pointer" : ""
                    }`}
                    data-testid={`ticket-row-${ticket.id}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`px-6 py-4 ${
                          cell.column.id === "createdAt"
                            ? "text-xs text-muted-foreground whitespace-nowrap"
                            : ""
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
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
    </div>
  );
}
