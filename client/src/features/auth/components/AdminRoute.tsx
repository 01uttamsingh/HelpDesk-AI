import { type ReactNode } from "react";
import { ProtectedRoute } from "./ProtectedRoute";

interface AdminRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export function AdminRoute({ children, redirectTo = "/" }: AdminRouteProps) {
  return (
    <ProtectedRoute requiredRole="ADMIN" redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
}

export default AdminRoute;
