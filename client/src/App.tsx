import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { AuthProvider, ProtectedRoute, AdminRoute, LoginPage } from "./features/auth";
import { UsersPage } from "./features/users";
import { TicketsPage, TicketDetailPage } from "./features/tickets";
import { Navbar } from "./components/Navbar";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased overflow-x-hidden">
          <Navbar />
          <main className="flex-1 w-full">
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets"
                element={
                  <ProtectedRoute>
                    <TicketsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:id"
                element={
                  <ProtectedRoute>
                    <TicketDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <AdminRoute>
                    <UsersPage />
                  </AdminRoute>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="border-t border-border bg-card py-4 text-center text-xs text-muted-foreground">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-1.5">
              <span>AI HelpDesk &copy; {new Date().getFullYear()}</span>
              <span>&bull;</span>
              <span>Made with 🖤</span>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
  );
}

export default App;
