import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Navbar } from "../Navbar";
import * as authModule from "@/features/auth";

vi.mock("@/features/auth", () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

describe("Navbar Navigation Highlighting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.useSession).mockReturnValue({
      isPending: false,
      data: {
        user: {
          id: "admin-1",
          name: "Alice Admin",
          email: "alice@example.com",
          role: "ADMIN",
        },
      },
    } as any);
  });

  it("highlights Dashboard when on root route '/'", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByTestId("nav-dashboard-link");
    const ticketsLink = screen.getByTestId("nav-tickets-link");
    const usersLink = screen.getByTestId("nav-users-link");

    // Dashboard should be active
    expect(dashboardLink).toHaveAttribute("aria-current", "page");
    expect(dashboardLink.className).toContain("text-foreground");
    expect(dashboardLink.className).toContain("font-bold");
    expect(dashboardLink.className).not.toContain("bg-primary");

    // Tickets and Users should NOT be active
    expect(ticketsLink).not.toHaveAttribute("aria-current");
    expect(ticketsLink.className).toContain("text-muted-foreground");
    expect(ticketsLink.className).toContain("font-medium");
    expect(usersLink).not.toHaveAttribute("aria-current");
    expect(usersLink.className).toContain("text-muted-foreground");
    expect(usersLink.className).toContain("font-medium");
  });

  it("highlights Tickets when on '/tickets'", () => {
    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <Navbar />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByTestId("nav-dashboard-link");
    const ticketsLink = screen.getByTestId("nav-tickets-link");

    expect(ticketsLink).toHaveAttribute("aria-current", "page");
    expect(ticketsLink.className).toContain("text-foreground");
    expect(ticketsLink.className).toContain("font-bold");
    expect(ticketsLink.className).not.toContain("bg-primary");

    expect(dashboardLink).not.toHaveAttribute("aria-current");
    expect(dashboardLink.className).toContain("text-muted-foreground");
  });

  it("highlights Tickets when on nested ticket details '/tickets/42'", () => {
    render(
      <MemoryRouter initialEntries={["/tickets/42"]}>
        <Navbar />
      </MemoryRouter>
    );

    const ticketsLink = screen.getByTestId("nav-tickets-link");
    expect(ticketsLink).toHaveAttribute("aria-current", "page");
    expect(ticketsLink.className).toContain("text-foreground");
    expect(ticketsLink.className).toContain("font-bold");
  });

  it("highlights Users when on '/users'", () => {
    render(
      <MemoryRouter initialEntries={["/users"]}>
        <Navbar />
      </MemoryRouter>
    );

    const usersLink = screen.getByTestId("nav-users-link");
    expect(usersLink).toHaveAttribute("aria-current", "page");
    expect(usersLink.className).toContain("text-foreground");
    expect(usersLink.className).toContain("font-bold");
  });
});
