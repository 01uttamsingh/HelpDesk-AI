import { useState } from "react";
import { useSession } from "@/features/auth";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { AdminDashboardStats } from "../components/AdminDashboardStats";
import { AgentDashboardStats } from "../components/AgentDashboardStats";
import { TicketVolumeChart } from "../components/TicketVolumeChart";
import { RecentAssignedTicketsTable } from "../components/RecentAssignedTicketsTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  LayoutDashboard,
  RefreshCw,
  AlertCircle,
  Shield,
  Headset,
  Layers,
  UserCheck,
} from "lucide-react";

export function DashboardPage() {
  const session = useSession();
  const user = session.data?.user;
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  // Admins can toggle between the System Overview (default) and their personal assigned tickets view
  const [adminViewTab, setAdminViewTab] = useState<"overview" | "assigned">("overview");

  const { stats, isLoading, isFetching, error, refetch } = useDashboardStats();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6" data-testid="dashboard-page">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard
            </h1>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                <Shield className="h-3 w-3" />
                Administrator
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
                <Headset className="h-3 w-3" />
                Support Agent
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Welcome back, <strong className="font-semibold text-foreground">{user?.name || "User"}</strong>! Here is your real-time support overview.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {isAdmin && (
            <div className="flex rounded-lg bg-muted/60 p-1 border border-border flex-1 sm:flex-initial justify-center">
              <button
                type="button"
                onClick={() => setAdminViewTab("overview")}
                className={`inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  adminViewTab === "overview"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="admin-tab-overview"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminViewTab("assigned")}
                className={`inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-initial px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  adminViewTab === "assigned"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="admin-tab-assigned"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>My Workload</span>
              </button>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs h-9 shrink-0"
            data-testid="refresh-dashboard-button"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" data-testid="dashboard-error-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load dashboard metrics</AlertTitle>
          <AlertDescription>
            {error.message || "An error occurred while fetching dashboard statistics. Please try refreshing."}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Dashboard Content */}
      {isAdmin ? (
        adminViewTab === "overview" ? (
          <div className="space-y-6">
            {/* 1. Admin Management KPIs */}
            <AdminDashboardStats stats={stats?.adminStats} isLoading={isLoading} />

            {/* 2. 30-Day Ticket Volume Bar Chart */}
            <TicketVolumeChart
              data={stats?.adminStats?.dailyTicketCounts}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Admin inspecting their personal assigned tickets */}
            <AgentDashboardStats stats={stats?.agentStats} isLoading={isLoading} />
            <RecentAssignedTicketsTable
              tickets={stats?.agentStats?.recentAssignedTickets}
              isLoading={isLoading}
            />
          </div>
        )
      ) : (
        <div className="space-y-6">
          {/* Agent View: Personal workload metrics and recent 10 assigned tickets */}
          <AgentDashboardStats stats={stats?.agentStats} isLoading={isLoading} />
          <RecentAssignedTicketsTable
            tickets={stats?.agentStats?.recentAssignedTickets}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
