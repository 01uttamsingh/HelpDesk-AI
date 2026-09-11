import { Card } from "@/components/ui/card";
import { Users, Shield, Headphones } from "lucide-react";

interface UserStatsCardsProps {
  totalCount: number;
  adminCount: number;
  agentCount: number;
  isLoading: boolean;
}

export function UserStatsCards({
  totalCount,
  adminCount,
  agentCount,
  isLoading,
}: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <Card className="p-3.5 sm:p-4 border-border bg-card hover:border-primary/40 hover:shadow-xs transition-all duration-150 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Total Users
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20">
            <Users className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {isLoading ? "..." : totalCount}
        </div>
      </Card>

      <Card className="p-3.5 sm:p-4 border-border bg-card hover:border-indigo-500/40 hover:shadow-xs transition-all duration-150 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Administrators
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Shield className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {isLoading ? "..." : adminCount}
        </div>
      </Card>

      <Card className="p-3.5 sm:p-4 border-border bg-card hover:border-cyan-500/40 hover:shadow-xs transition-all duration-150 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            Support Agents
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Headphones className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {isLoading ? "..." : agentCount}
        </div>
      </Card>
    </div>
  );
}
