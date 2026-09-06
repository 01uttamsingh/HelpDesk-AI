import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Shield,
  Headphones,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";
import { api } from "@/lib/api";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "AGENT">("ALL");

  const {
    data: users = [],
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery<UserItem[], Error>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<{
        success: boolean;
        data?: UserItem[];
        error?: string;
      }>("/api/users");

      if (res.data.success && Array.isArray(res.data.data)) {
        return res.data.data;
      }
      throw new Error(res.data.error || "Invalid response from server");
    },
  });

  // User-friendly error message extraction
  const error = useMemo(() => {
    if (!queryError) return null;
    if (axios.isAxiosError(queryError)) {
      if (queryError.response?.status === 401) {
        return "You must be signed in to view users.";
      }
      if (queryError.response?.status === 403) {
        return "Access denied. Admin privileges are required.";
      }
      return (
        queryError.response?.data?.error ||
        queryError.message ||
        "Failed to load users"
      );
    }
    return queryError.message || "Failed to load users";
  }, [queryError]);

  // Filter users based on search term and role filter
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        roleFilter === "ALL" || u.role?.toUpperCase() === roleFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);

      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Count summaries
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role?.toUpperCase() === "ADMIN").length;
  const agentCount = users.filter((u) => u.role?.toUpperCase() === "AGENT").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Users
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage platform users, roles, and administrative permissions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin text-muted-foreground" : ""}`}
          />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total Users
            </span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {isLoading ? "..." : totalCount}
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Administrators
            </span>
            <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {isLoading ? "..." : adminCount}
          </div>
        </Card>

        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Support Agents
            </span>
            <Headphones className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {isLoading ? "..." : agentCount}
          </div>
        </Card>
      </div>

      {/* Controls: Search and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRoleFilter("ALL")}
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
            onClick={() => setRoleFilter("ADMIN")}
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
            onClick={() => setRoleFilter("AGENT")}
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

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Users</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 mt-1">
            <span>{error}</span>
            <Button
              variant="outline"
              size="xs"
              onClick={() => refetch()}
              className="shrink-0"
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="users-table">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  User
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Email
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Role
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Email Status
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                // Loading Skeleton Rows
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/60" />
                      <p className="text-sm font-medium text-foreground">
                        {searchQuery
                          ? `No users found matching "${searchQuery}"`
                          : "No users registered"}
                      </p>
                      {searchQuery && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSearchQuery("")}
                          className="mt-1 text-xs"
                        >
                          Clear search filter
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // User Row Rendering
                filteredUsers.map((user) => {
                  const initial = user.name
                    ? user.name.charAt(0).toUpperCase()
                    : "U";
                  const isAdmin = user.role?.toUpperCase() === "ADMIN";
                  const joinedDate = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shadow-xs ${
                              isAdmin
                                ? "bg-purple-600 text-white"
                                : "bg-blue-600 text-white"
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">
                              {user.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isAdmin ? (
                          <Badge variant="admin" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="agent" className="gap-1">
                            <Headphones className="h-3 w-3" />
                            Agent
                          </Badge>
                        )}
                      </td>

                      {/* Email Verification Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.emailVerified ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>{joinedDate}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UsersPage;
