import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, AlertCircle, Database, Server } from "lucide-react";
import { useSession } from "../context/AuthContext";
import { api } from "../lib/api";

interface HealthResponse {
  status: string;
  database: string;
  message: string;
  timestamp: string;
}

export function HomePage() {
  const session = useSession();

  const {
    data: health,
    isLoading: healthLoading,
    error: queryError,
  } = useQuery<HealthResponse, Error>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await api.get<HealthResponse>("/api/health");
      return res.data;
    },
  });

  const healthError = useMemo(() => {
    if (!queryError) return null;
    if (axios.isAxiosError(queryError)) {
      return queryError.response?.data?.message || queryError.message;
    }
    return queryError.message || "Failed to contact backend API";
  }, [queryError]);

  const user = session.data?.user;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome, {user?.name}!
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Authenticated
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{user?.email}</span>
            </p>
          </div>
        </div>

        {/* Backend & Database Status Card */}
        <div className="rounded-2xl bg-card border border-border p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              System Status
            </h2>
            {healthLoading ? (
              <span className="text-xs text-muted-foreground">Checking...</span>
            ) : health ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20">
                <AlertCircle className="h-3.5 w-3.5" />
                Degraded
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="p-2 rounded-lg bg-card border border-border shadow-xs">
                <Server className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">API Server</p>
                  <span className="text-xs text-muted-foreground">Port 5000</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {healthLoading
                    ? "Connecting..."
                    : healthError
                    ? healthError
                    : "Connected"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div className="p-2 rounded-lg bg-card border border-border shadow-xs">
                <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Database</p>
                  <span className="text-xs text-muted-foreground">Port 5433</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {healthLoading
                    ? "Querying database..."
                    : health?.database === "connected"
                    ? "Connected"
                    : "Disconnected"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
