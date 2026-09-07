import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersTable } from "../components/UsersTable";
import type { UserItem } from "../types";

const mockUsers: UserItem[] = [
  {
    id: "user-1",
    name: "Admin User",
    email: "admin@example.com",
    role: "ADMIN",
    emailVerified: true,
    image: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-2",
    name: "Agent User",
    email: "agent@example.com",
    role: "AGENT",
    emailVerified: false,
    image: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("UsersTable Component", () => {
  it("renders table with headers, rows, badges, edit buttons, and delete buttons", () => {
    render(
      <UsersTable
        users={mockUsers}
        isLoading={false}
        searchQuery=""
        onClearSearch={vi.fn()}
        onEditUser={vi.fn()}
        onDeleteUser={vi.fn()}
      />
    );

    expect(screen.getByTestId("users-table")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();

    expect(screen.getByText("Agent User")).toBeInTheDocument();
    expect(screen.getByText("agent@example.com")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    expect(screen.getByTestId("edit-user-user-1")).toBeInTheDocument();
    expect(screen.getByTestId("edit-user-user-2")).toBeInTheDocument();

    // Admin delete button is disabled
    const adminDeleteBtn = screen.getByRole("button", { name: "Cannot delete admin user" });
    expect(adminDeleteBtn).toBeDisabled();
    expect(adminDeleteBtn).toHaveAttribute("title", "Administrators cannot be deleted");

    // Agent delete button is enabled
    expect(screen.getByTestId("delete-user-user-2")).toBeInTheDocument();
  });

  it("calls onEditUser when clicking the edit button", async () => {
    const user = userEvent.setup();
    const handleEditUser = vi.fn();

    render(
      <UsersTable
        users={mockUsers}
        isLoading={false}
        searchQuery=""
        onClearSearch={vi.fn()}
        onEditUser={handleEditUser}
        onDeleteUser={vi.fn()}
      />
    );

    await user.click(screen.getByTestId("edit-user-user-1"));
    expect(handleEditUser).toHaveBeenCalledWith(mockUsers[0]);
  });

  it("calls onDeleteUser when clicking the delete button for agent user", async () => {
    const user = userEvent.setup();
    const handleDeleteUser = vi.fn();

    render(
      <UsersTable
        users={mockUsers}
        isLoading={false}
        searchQuery=""
        onClearSearch={vi.fn()}
        onEditUser={vi.fn()}
        onDeleteUser={handleDeleteUser}
      />
    );

    await user.click(screen.getByTestId("delete-user-user-2"));
    expect(handleDeleteUser).toHaveBeenCalledWith(mockUsers[1]);
  });

  it("renders empty state when users array is empty", () => {
    render(
      <UsersTable
        users={[]}
        isLoading={false}
        searchQuery=""
        onClearSearch={vi.fn()}
        onEditUser={vi.fn()}
        onDeleteUser={vi.fn()}
      />
    );

    expect(screen.getByText("No users registered")).toBeInTheDocument();
  });

  it("renders empty search state and calls onClearSearch when clear button clicked", async () => {
    const user = userEvent.setup();
    const handleClearSearch = vi.fn();

    render(
      <UsersTable
        users={[]}
        isLoading={false}
        searchQuery="nonexistent"
        onClearSearch={handleClearSearch}
        onEditUser={vi.fn()}
        onDeleteUser={vi.fn()}
      />
    );

    expect(
      screen.getByText('No users found matching "nonexistent"')
    ).toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: "Clear search filter" });
    await user.click(clearButton);
    expect(handleClearSearch).toHaveBeenCalledTimes(1);
  });
});
