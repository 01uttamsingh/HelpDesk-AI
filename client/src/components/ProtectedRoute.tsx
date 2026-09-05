import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSession } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const session = useSession();

  // While checking database session
  if (session.isPending) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </div>
    );
  }

  // If unauthenticated, redirect to /login
  if (!session.data?.user) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render protected content
  return <>{children}</>;
}

export default ProtectedRoute;
