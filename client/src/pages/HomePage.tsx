import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Database, Server } from "lucide-react";
import { useSession } from "../context/AuthContext";

interface HealthResponse {
  status: string;
  database: string;
  message: string;
  timestamp: string;
}

export function HomePage() {
  const session = useSession();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API returned status ${res.status}`);
        }
        return res.json();
      })
      .then((data: HealthResponse) => {
        setHealth(data);
      })
      .catch((err) => {
        setHealthError(err.message || "Failed to contact backend API");
      })
      .finally(() => {
        setHealthLoading(false);
      });
  }, []);

  const user = session.data?.user;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Welcome, {user?.name}!
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Authenticated
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Signed in as <span className="font-medium text-slate-800">{user?.email}</span>
            </p>
          </div>
        </div>

        {/* Backend & Database Status Card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Server className="h-4 w-4 text-slate-500" />
              System Status
            </h2>
            {healthLoading ? (
              <span className="text-xs text-slate-500">Checking...</span>
            ) : health ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                <AlertCircle className="h-3.5 w-3.5" />
                Degraded
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                <Server className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">API Server</p>
                  <span className="text-xs text-slate-500">Port 5000</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {healthLoading
                    ? "Connecting..."
                    : healthError
                    ? healthError
                    : "Connected"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
                <Database className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">Database</p>
                  <span className="text-xs text-slate-500">Port 5433</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
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
