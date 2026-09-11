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

  it("toggles navigation drawer when clicking hamburger button", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    // Navigation drawer is initially closed
    expect(screen.queryByTestId("navbar-mobile-menu")).not.toBeInTheDocument();

    // Click hamburger button to open menu
    const mobileToggle = screen.getByTestId("navbar-mobile-toggle");
    // Toggle should be hidden on desktop/laptop screens (md:hidden)
    expect(mobileToggle.className).toContain("md:hidden");
    await user.click(mobileToggle);

    expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-dashboard-link")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-tickets-link")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-users-link")).toBeInTheDocument();

    // Click again to close
    await user.click(mobileToggle);
    expect(screen.queryByTestId("navbar-mobile-menu")).not.toBeInTheDocument();
  });

  it("renders the profile name with user icon on the right side", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const userProfile = screen.getByTestId("navbar-user-profile");
    expect(userProfile).toBeInTheDocument();
    expect(userProfile).toHaveTextContent("Alice Admin");
  });

  it("opens proper full-height left-side drawer with signout button and handles sign out", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    // Open drawer
    const mobileToggle = screen.getByTestId("navbar-mobile-toggle");
    await user.click(mobileToggle);

    // Check drawer container, full-height and responsive width styling
    const drawer = screen.getByTestId("navbar-mobile-drawer");
    expect(drawer).toBeInTheDocument();
    expect(drawer.className).toContain("left-0");
    expect(drawer.className).toContain("h-screen");
    expect(drawer.className).toContain("w-72");

    // Check sign out button inside the drawer
    const drawerSignOutBtn = screen.getByTestId("drawer-sign-out-button");
    expect(drawerSignOutBtn).toBeInTheDocument();
    expect(drawerSignOutBtn).toHaveTextContent(/sign out/i);
    expect(drawerSignOutBtn.className).toContain("self-start");

    // Click sign out button in drawer
    await user.click(drawerSignOutBtn);
    expect(authModule.signOut).toHaveBeenCalledTimes(1);
  });

  it("closes the drawer when clicking the close button or backdrop", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Navbar />
      </MemoryRouter>
    );

    const mobileToggle = screen.getByTestId("navbar-mobile-toggle");
    await user.click(mobileToggle);
    expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();

    // Click close button inside drawer
    const closeBtn = screen.getByTestId("navbar-mobile-close");
    await user.click(closeBtn);
    expect(screen.queryByTestId("navbar-mobile-menu")).not.toBeInTheDocument();

    // Open again and click backdrop
    await user.click(mobileToggle);
    expect(screen.getByTestId("navbar-mobile-menu")).toBeInTheDocument();
    const backdrop = screen.getByTestId("navbar-mobile-backdrop");
    await user.click(backdrop);
    expect(screen.queryByTestId("navbar-mobile-menu")).not.toBeInTheDocument();
  });
});
