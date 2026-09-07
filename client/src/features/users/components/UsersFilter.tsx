import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { RoleFilter } from "../types";

interface UsersFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  roleFilter: RoleFilter;
  onRoleFilterChange: (role: RoleFilter) => void;
  totalCount: number;
  adminCount: number;
  agentCount: number;
}

export function UsersFilter({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  totalCount,
  adminCount,
  agentCount,
}: UsersFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Role Filters */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border self-start sm:self-auto">
        <button
          type="button"
          onClick={() => onRoleFilterChange("ALL")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            roleFilter === "ALL"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => onRoleFilterChange("ADMIN")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            roleFilter === "ADMIN"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Admins ({adminCount})
        </button>
        <button
          type="button"
          onClick={() => onRoleFilterChange("AGENT")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
            roleFilter === "AGENT"
              ? "bg-card text-foreground shadow-xs border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Agents ({agentCount})
        </button>
      </div>
    </div>
  );
}
