import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LifeBuoy,
  LogIn,
  LogOut,
  User,
  Loader2,
  Menu,
  X,
  LayoutDashboard,
  Ticket,
  Users,
} from "lucide-react";
import { useSession, signOut } from "@/features/auth";
import { ThemeToggle } from "./ThemeToggle";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isDashboardActive = location.pathname === "/";
  const isTicketsActive = location.pathname.startsWith("/tickets");
  const isUsersActive = location.pathname.startsWith("/users");

  // Close navigation drawer whenever route location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close drawer and lock body scroll when open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      await session.refetch?.();
      setIsMobileMenuOpen(false);
      navigate("/login");
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const user = session.data?.user;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Left Section: Menu Toggle + Brand Logo + Desktop Nav */}
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Menu Drawer Toggle Button (mobile only, hidden on md+) */}
          {user && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer border border-border/40"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
              data-testid="navbar-mobile-toggle"
            >
              {isMobileMenuOpen ? (
                <X className="h-4.5 w-4.5" />
              ) : (
                <Menu className="h-4.5 w-4.5" />
              )}
            </button>
          )}

          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 transition-opacity hover:opacity-90 shrink-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-xs ring-1 ring-primary/20">
              <LifeBuoy className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">Helpdesk</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-primary border border-primary/20">
                AI
              </span>
            </div>
          </Link>

          {/* Desktop Segmented Pill Navigation Links (hidden on < md) */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
              <Link
                to="/"
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                  isDashboardActive
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
                aria-current={isDashboardActive ? "page" : undefined}
                data-testid="nav-dashboard-link"
              >
                Dashboard
              </Link>
              <Link
                to="/tickets"
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                  isTicketsActive
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
                aria-current={isTicketsActive ? "page" : undefined}
                data-testid="nav-tickets-link"
              >
                Tickets
              </Link>
              {user.role?.toUpperCase() === "ADMIN" && (
                <Link
                  to="/users"
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                    isUsersActive
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  )}
                  aria-current={isUsersActive ? "page" : undefined}
                  data-testid="nav-users-link"
                >
                  Users
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Section: Theme Toggle + Auth State & User Info */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle />
          {session.isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-16 sm:w-24 bg-muted animate-pulse rounded-md" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* User Profile on right side */}
              <div
                className="flex items-center gap-1.5 sm:gap-2 py-1 px-2 sm:px-2.5 rounded-lg bg-muted/40 border border-border/60 max-w-[150px] xs:max-w-[180px] sm:max-w-xs shrink-0"
                data-testid="navbar-user-profile"
              >
                <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/25">
                  {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-foreground leading-tight truncate">
                    {user.name}
                  </span>
                  <span className="hidden sm:block text-[11px] text-muted-foreground leading-none truncate">
                    {user.email}
                  </span>
                </div>
              </div>

              {/* Desktop Sign Out Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                title="Sign out of your account"
                className="hidden md:inline-flex gap-1.5 h-8 px-2.5 sm:px-3 text-xs sm:text-sm shrink-0 cursor-pointer border-border/60 hover:bg-muted/50"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Sign out</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Link
              to="/login"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5 text-xs sm:text-sm shadow-xs font-medium")}
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>

      {/* Slide-Out Navigation Drawer (rendered via React Portal to cover full screen on all screen sizes) */}
      {user && isMobileMenuOpen && typeof document !== "undefined" && createPortal(
        <div data-testid="navbar-mobile-menu" className="relative z-50">
          {/* Full-screen Backdrop Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
            data-testid="navbar-mobile-backdrop"
          />

          {/* Full-height Drawer Panel */}
          <div
            className="fixed top-0 bottom-0 left-0 z-50 h-screen h-[100dvh] max-h-[100dvh] w-72 sm:w-80 max-w-[85vw] bg-background border-r border-border shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            data-testid="navbar-mobile-drawer"
          >
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between px-4 sm:px-5 border-b border-border shrink-0 bg-muted/10">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs shrink-0">
                  <LifeBuoy className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-foreground">
                    Helpdesk
                  </span>
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground border border-border">
                    AI
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
                aria-label="Close navigation menu"
                data-testid="navbar-mobile-close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
              <div className="px-3 pb-2 text-xs font-medium text-muted-foreground">
                Navigation
              </div>

              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors",
                  isDashboardActive
                    ? "bg-primary/10 text-primary font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                )}
                aria-current={isDashboardActive ? "page" : undefined}
                data-testid="mobile-nav-dashboard-link"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/tickets"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors",
                  isTicketsActive
                    ? "bg-primary/10 text-primary font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                )}
                aria-current={isTicketsActive ? "page" : undefined}
                data-testid="mobile-nav-tickets-link"
              >
                <Ticket className="h-4 w-4 shrink-0" />
                <span>Tickets</span>
              </Link>

              {user.role?.toUpperCase() === "ADMIN" && (
                <Link
                  to="/users"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors",
                    isUsersActive
                      ? "bg-primary/10 text-primary font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
                  )}
                  aria-current={isUsersActive ? "page" : undefined}
                  data-testid="mobile-nav-users-link"
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Users</span>
                </Link>
              )}
            </div>

            {/* Drawer Footer with User Info & Sign Out Button pinned to the bottom */}
            <div className="mt-auto shrink-0 border-t border-border bg-muted/20 p-4 pb-6 sm:pb-4 flex flex-col gap-3">
              {/* User info in drawer */}
              <div className="flex items-center gap-3 w-full min-w-0 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {user.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </span>
                  <span className="inline-block mt-0.5 text-[10px] text-muted-foreground uppercase font-semibold">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Theme switcher in drawer */}
              <ThemeToggle showLabel className="w-full" />

              {/* Sign Out Button strictly pinned at the bottom of drawer */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer h-9 px-3 text-xs self-start"
                data-testid="drawer-sign-out-button"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 shrink-0" />
                    <span>Sign out</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}

export default Navbar;
