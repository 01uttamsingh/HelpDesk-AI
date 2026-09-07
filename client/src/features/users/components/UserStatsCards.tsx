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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4 border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Total Users
          </span>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground">
          {isLoading ? "..." : totalCount}
        </div>
      </Card>

      <Card className="p-4 border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Administrators
          </span>
          <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground">
          {isLoading ? "..." : adminCount}
        </div>
      </Card>

      <Card className="p-4 border-border bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Support Agents
          </span>
          <Headphones className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="mt-2 text-2xl font-bold text-foreground">
          {isLoading ? "..." : agentCount}
        </div>
      </Card>
    </div>
  );
}
