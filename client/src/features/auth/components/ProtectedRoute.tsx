import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/",
}: ProtectedRouteProps) {
  const session = useSession();

  // While checking database session
  if (session.isPending) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If unauthenticated, redirect to /login
  if (!session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  // If role is required and user's role does not match, redirect
  if (
    requiredRole &&
    session.data.user.role?.toUpperCase() !== requiredRole.toUpperCase()
  ) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
