import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LifeBuoy, LogIn, LogOut, User, Loader2 } from "lucide-react";
import { useSession, signOut } from "@/features/auth";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const navigate = useNavigate();
  const session = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      await session.refetch();
      navigate("/login");
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const user = session.data?.user;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section: Brand Logo & Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-foreground">Helpdesk</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground border border-border">
                AI
              </span>
            </div>
          </Link>

          {user && (
            <nav className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-dashboard-link"
              >
                Dashboard
              </Link>
              <Link
                to="/tickets"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                data-testid="nav-tickets-link"
              >
                Tickets
              </Link>
              {user.role?.toUpperCase() === "ADMIN" && (
                <Link
                  to="/users"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Users
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Right Section: Auth State */}
        <div className="flex items-center gap-3">
          {session.isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* User Avatar & Name */}
              <div className="flex items-center gap-2.5 py-1 px-2.5 rounded-lg bg-muted/50 border border-border">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                  {user.name ? (
                    user.name.charAt(0).toUpperCase()
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-foreground leading-tight">
                    {user.name}
                  </span>
                  <span className="text-xs text-muted-foreground leading-none">
                    {user.email}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                title="Sign out of your account"
                className="gap-1.5"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    <span>Sign out</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Link
              to="/login"
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
