import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersFilter } from "../components/UsersFilter";

describe("UsersFilter Component", () => {
  it("renders search input and role filter buttons with counts", () => {
    render(
      <UsersFilter
        searchQuery=""
        onSearchChange={vi.fn()}
        roleFilter="ALL"
        onRoleFilterChange={vi.fn()}
        totalCount={10}
        adminCount={3}
        agentCount={7}
      />
    );

    expect(
      screen.getByPlaceholderText("Search users by name or email...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All (10)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admins (3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agents (7)" })).toBeInTheDocument();
  });

  it("triggers onSearchChange when typing in search input", async () => {
    const user = userEvent.setup();
    const handleSearchChange = vi.fn();

    render(
      <UsersFilter
        searchQuery=""
        onSearchChange={handleSearchChange}
        roleFilter="ALL"
        onRoleFilterChange={vi.fn()}
        totalCount={10}
        adminCount={3}
        agentCount={7}
      />
    );

    const input = screen.getByPlaceholderText("Search users by name or email...");
    await user.type(input, "alice");

    expect(handleSearchChange).toHaveBeenCalled();
  });

  it("triggers onRoleFilterChange when clicking filter buttons", async () => {
    const user = userEvent.setup();
    const handleRoleFilterChange = vi.fn();

    render(
      <UsersFilter
        searchQuery=""
        onSearchChange={vi.fn()}
        roleFilter="ALL"
        onRoleFilterChange={handleRoleFilterChange}
        totalCount={10}
        adminCount={3}
        agentCount={7}
      />
    );

    await user.click(screen.getByRole("button", { name: "Admins (3)" }));
    expect(handleRoleFilterChange).toHaveBeenCalledWith("ADMIN");

    await user.click(screen.getByRole("button", { name: "Agents (7)" }));
    expect(handleRoleFilterChange).toHaveBeenCalledWith("AGENT");

    await user.click(screen.getByRole("button", { name: "All (10)" }));
    expect(handleRoleFilterChange).toHaveBeenCalledWith("ALL");
  });
});
