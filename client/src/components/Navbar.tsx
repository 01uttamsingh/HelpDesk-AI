import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LifeBuoy, LogIn, LogOut, User, Loader2 } from "lucide-react";
import { useSession } from "../context/AuthContext";
import { signOut } from "../lib/auth-client";

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
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900">Helpdesk</span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
              AI
            </span>
          </div>
        </Link>

        {/* Right Section: Auth State */}
        <div className="flex items-center gap-3">
          {session.isPending ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md" />
              <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-full" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              {/* User Avatar & Name */}
              <div className="flex items-center gap-2.5 py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                  {user.name ? (
                    user.name.charAt(0).toUpperCase()
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-slate-900 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-xs text-slate-500 leading-none">
                    {user.email}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-colors cursor-pointer"
                title="Sign out of your account"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 text-slate-500" />
                    <span>Sign out</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors cursor-pointer"
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
