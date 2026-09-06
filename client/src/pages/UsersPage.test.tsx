import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { UsersPage, type UserItem } from "./UsersPage";
import { api } from "@/lib/api";
import { renderWithQuery, createTestQueryClient } from "@/test/renderWithQuery";

const mockUsers: UserItem[] = [
  {
    id: "user-1",
    name: "Admin Alice",
    email: "admin@example.com",
    role: "ADMIN",
    emailVerified: true,
    image: null,
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
  },
  {
    id: "user-2",
    name: "Bob Agent",
    email: "bob.agent@example.com",
    role: "AGENT",
    emailVerified: false,
    image: null,
    createdAt: "2026-02-20T15:30:00.000Z",
    updatedAt: "2026-02-20T15:30:00.000Z",
  },
];

function createAxiosError(status: number, message: string, serverError?: string) {
  return new AxiosError(
    message,
    status.toString(),
    undefined,
    undefined,
    {
      status,
      statusText: message,
      data: { success: false, error: serverError || message },
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
  );
}

describe("UsersPage Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe("1. Loading State", () => {
    it("renders loading skeletons and placeholder counts while fetching users", () => {
      // Pending promise that doesn't resolve immediately
      vi.spyOn(api, "get").mockImplementation(() => new Promise(() => {}));

      renderWithQuery(<UsersPage />);

      // Summary cards show loading placeholder
      const placeholderElements = screen.getAllByText("...");
      expect(placeholderElements).toHaveLength(3);

      // Skeleton elements exist in the table body
      const table = screen.getByTestId("users-table");
      const skeletons = table.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
      // 4 rows * 6 skeleton elements = 24 skeletons
      expect(skeletons.length).toBe(24);
    });
  });

  describe("2. Successful User List Rendering", () => {
    it("renders page header, summary statistics, and user details in table", async () => {
      vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: mockUsers },
      });

      renderWithQuery(<UsersPage />);

      // Header and subtitle
      expect(
        screen.getByRole("heading", { name: "Users", level: 1 })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Manage platform users, roles, and administrative permissions.")
      ).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      });

      const totalCard = screen.getByText("Total Users").closest("div.border-border") as HTMLElement;
      expect(within(totalCard).getByText("2")).toBeInTheDocument();

      const adminCard = screen.getByText("Administrators").closest("div.border-border") as HTMLElement;
      expect(within(adminCard).getByText("1")).toBeInTheDocument();

      const agentCard = screen.getByText("Support Agents").closest("div.border-border") as HTMLElement;
      expect(within(agentCard).getByText("1")).toBeInTheDocument();

      // Table rows
      const table = screen.getByTestId("users-table");
      expect(within(table).getByText("Admin Alice")).toBeInTheDocument();
      expect(within(table).getByText("admin@example.com")).toBeInTheDocument();
      expect(within(table).getByText("Bob Agent")).toBeInTheDocument();
      expect(within(table).getByText("bob.agent@example.com")).toBeInTheDocument();

      // Badges
      expect(within(table).getByText("Admin")).toBeInTheDocument();
      expect(within(table).getByText("Agent")).toBeInTheDocument();
      expect(within(table).getByText("Verified")).toBeInTheDocument();
      expect(within(table).getByText("Pending")).toBeInTheDocument();

      // Avatar initials
      expect(within(table).getByText("A")).toBeInTheDocument();
      expect(within(table).getByText("B")).toBeInTheDocument();
    });
  });

  describe("3. Search & Text Filtering", () => {
    it("filters users in real-time when searching by user name", async () => {
      const user = userEvent.setup();
      vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: mockUsers },
      });

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users by name or email...");
      await user.type(searchInput, "Bob");

      expect(screen.getByText("Bob Agent")).toBeInTheDocument();
      expect(screen.queryByText("Admin Alice")).not.toBeInTheDocument();
    });

    it("filters users by email with case-insensitivity and whitespace trimming", async () => {
      const user = userEvent.setup();
      vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: mockUsers },
      });

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users by name or email...");
      await user.type(searchInput, "  ADMIN@EXAMPLE.COM  ");

      expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob Agent")).not.toBeInTheDocument();
    });

    it("displays empty search state and clears filter when clicking 'Clear search filter'", async () => {
      const user = userEvent.setup();
      vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: mockUsers },
      });

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Search users by name or email...");
      await user.type(searchInput, "NonexistentName");

      expect(
        screen.getByText('No users found matching "NonexistentName"')
      ).toBeInTheDocument();
      expect(screen.queryByText("Admin Alice")).not.toBeInTheDocument();
      expect(screen.queryByText("Bob Agent")).not.toBeInTheDocument();

      const clearButton = screen.getByRole("button", { name: "Clear search filter" });
      await user.click(clearButton);

      expect(searchInput).toHaveValue("");
      expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    });
  });

  describe("4. Role Filtering", () => {
    it("filters to only administrators when clicking 'Admins' filter button", async () => {
      const user = userEvent.setup();
      vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: mockUsers },
      });

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      });

      const adminsButton = screen.getByRole("button", { name: /^Admins/ });
      await user.click(adminsButton);

      expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      expect(screen.queryByText("Bob Agent")).not.toBeInTheDocument();
    });

    it("filters to only support agents when clicking 'Agents' filter button", async () => {
      const user = userEvent.setup();
      vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: mockUsers },
      });

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Bob Agent")).toBeInTheDocument();
      });

      const agentsButton = screen.getByRole("button", { name: /^Agents/ });
      await user.click(agentsButton);

      expect(screen.getByText("Bob Agent")).toBeInTheDocument();
      expect(screen.queryByText("Admin Alice")).not.toBeInTheDocument();
    });

    it("restores all users when clicking 'All' filter button", async () => {
      const user = userEvent.setup();
      vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: mockUsers },
      });

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      });

      // Filter to Admins first
      await user.click(screen.getByRole("button", { name: /^Admins/ }));
      expect(screen.queryByText("Bob Agent")).not.toBeInTheDocument();

      // Click All
      await user.click(screen.getByRole("button", { name: /^All/ }));
      expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    });
  });

  describe("5. Empty State (Zero Users)", () => {
    it("renders 'No users registered' message when user list is empty", async () => {
      vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: [] },
      });

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("No users registered")).toBeInTheDocument();
      });

      // Clear button should not be present when not searching
      expect(
        screen.queryByRole("button", { name: "Clear search filter" })
      ).not.toBeInTheDocument();

      // Counts should be 0
      const totalCard = screen.getByText("Total Users").closest("div.border-border") as HTMLElement;
      expect(within(totalCard).getByText("0")).toBeInTheDocument();
    });
  });

  describe("6. Error Handling & Retry", () => {
    it("displays 401 unauthorized error message and allows retry", async () => {
      const user = userEvent.setup();
      const getSpy = vi
        .spyOn(api, "get")
        .mockRejectedValueOnce(createAxiosError(401, "Unauthorized"))
        .mockResolvedValueOnce({
          data: { success: true, data: mockUsers },
        });

      const queryClient = createTestQueryClient();
      renderWithQuery(<UsersPage />, queryClient);

      await waitFor(() => {
        expect(
          screen.getByText("You must be signed in to view users.")
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Error Loading Users")).toBeInTheDocument();

      const tryAgainButton = screen.getByRole("button", { name: "Try Again" });
      await user.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      });
      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    it("displays 403 forbidden error message when agent attempts access", async () => {
      vi.spyOn(api, "get").mockRejectedValue(
        createAxiosError(403, "Forbidden", "Access denied. Admin privileges are required.")
      );

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Access denied. Admin privileges are required.")
        ).toBeInTheDocument();
      });
    });

    it("displays custom server error message on 500 error", async () => {
      vi.spyOn(api, "get").mockRejectedValue(
        createAxiosError(500, "Internal Server Error", "Database connection failed")
      );

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Database connection failed")).toBeInTheDocument();
      });
    });
  });

  describe("7. Refresh Button Action", () => {
    it("triggers data refetch when clicking the Refresh button in header", async () => {
      const user = userEvent.setup();
      const getSpy = vi.spyOn(api, "get").mockResolvedValue({
        data: { success: true, data: mockUsers },
      });

      renderWithQuery(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Alice")).toBeInTheDocument();
      });
      expect(getSpy).toHaveBeenCalledTimes(1);

      const refreshButton = screen.getByRole("button", { name: /Refresh/i });
      await user.click(refreshButton);

      expect(getSpy).toHaveBeenCalledTimes(2);
    });
  });
});
