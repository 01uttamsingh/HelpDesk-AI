import {
  Users,
  Shield,
  Headphones,
  CheckCircle2,
  Clock,
  Mail,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserItem } from "../types";

interface UsersTableProps {
  users: UserItem[];
  isLoading: boolean;
  searchQuery: string;
  onClearSearch: () => void;
  onEditUser: (user: UserItem) => void;
  onDeleteUser: (user: UserItem) => void;
}

export function UsersTable({
  users,
  isLoading,
  searchQuery,
  onClearSearch,
  onEditUser,
  onDeleteUser,
}: UsersTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="users-table">
          <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-3 sm:px-6 py-3 sm:py-3.5">
                User
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 sm:py-3.5">
                Email
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 sm:py-3.5">
                Role
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 sm:py-3.5">
                Email Status
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 sm:py-3.5">
                Joined
              </th>
              <th scope="col" className="px-3 sm:px-6 py-3 sm:py-3.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx}>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <Skeleton className="h-4 w-36" />
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <Skeleton className="h-5 w-16" />
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <Skeleton className="h-5 w-20" />
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    <Skeleton className="h-7 w-7 rounded-md ml-auto" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
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
                        onClick={onClearSearch}
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
              users.map((user) => {
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div
                          className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs font-bold shadow-xs shrink-0 ${
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        <span>{user.email}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
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
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                        <span>{joinedDate}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onEditUser(user)}
                          aria-label={`Edit ${user.name}`}
                          data-testid={`edit-user-${user.id}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            disabled
                            aria-label="Cannot delete admin user"
                            title="Administrators cannot be deleted"
                            className="text-muted-foreground/30 cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDeleteUser(user)}
                            aria-label={`Delete ${user.name}`}
                            data-testid={`delete-user-${user.id}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
  );
}
