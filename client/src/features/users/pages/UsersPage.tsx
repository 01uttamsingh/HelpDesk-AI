import { useState, useMemo } from "react";
import { Users, RefreshCw, AlertCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUsers } from "../hooks/useUsers";
import { UserStatsCards } from "../components/UserStatsCards";
import { UsersFilter } from "../components/UsersFilter";
import { UsersTable } from "../components/UsersTable";
import { CreateUserModal } from "../components/CreateUserModal";
import { EditUserModal } from "../components/EditUserModal";
import { DeleteUserModal } from "../components/DeleteUserModal";
import type { UserItem, RoleFilter } from "../types";

export function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  const {
    users,
    isLoading,
    isFetching,
    errorMessage,
    refetch,
  } = useUsers();

  // Filter users based on search query and role filter
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin text-muted-foreground" : ""}`}
            />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2"
            data-testid="create-user-button"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create User</span>
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <UserStatsCards
        totalCount={totalCount}
        adminCount={adminCount}
        agentCount={agentCount}
        isLoading={isLoading}
      />

      {/* Controls: Search and Filter Tabs */}
      <UsersFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        totalCount={totalCount}
        adminCount={adminCount}
        agentCount={agentCount}
      />

      {/* Error State */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Users</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 mt-1">
            <span>{errorMessage}</span>
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
      <UsersTable
        users={filteredUsers}
        isLoading={isLoading}
        searchQuery={searchQuery}
        onClearSearch={() => setSearchQuery("")}
        onEditUser={setEditingUser}
        onDeleteUser={setDeletingUser}
      />

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditUserModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
      />

      <DeleteUserModal
        user={deletingUser}
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
      />
    </div>
  );
}

export default UsersPage;
