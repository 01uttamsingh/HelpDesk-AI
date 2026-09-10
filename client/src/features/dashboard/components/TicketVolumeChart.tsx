import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Calendar, Zap } from "lucide-react";
import type { DailyTicketCount } from "../types";

interface TicketVolumeChartProps {
  data?: DailyTicketCount[];
  isLoading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: DailyTicketCount }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload;
    const count = payload[0].value;
    return (
      <div className="rounded-lg border border-border bg-popover/95 p-2.5 shadow-md backdrop-blur-xs">
        <p className="text-xs font-medium text-muted-foreground">{item.label} ({item.date})</p>
        <p className="text-sm font-bold text-foreground mt-0.5 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {count} {count === 1 ? "ticket" : "tickets"}
        </p>
      </div>
    );
  }
  return null;
}

export function TicketVolumeChart({ data = [], isLoading = false }: TicketVolumeChartProps) {
  const { totalIn30Days, dailyAvg, peakDay } = useMemo(() => {
    if (!data || data.length === 0) {
      return { totalIn30Days: 0, dailyAvg: "0.0", peakDay: null };
    }

    const total = data.reduce((acc, curr) => acc + curr.count, 0);
    const avg = (total / data.length).toFixed(1);
    const peak = [...data].sort((a, b) => b.count - a.count)[0];

    return {
      totalIn30Days: total,
      dailyAvg: avg,
      peakDay: peak && peak.count > 0 ? peak : null,
    };
  }, [data]);

  return (
    <Card className="border-border bg-card shadow-xs" data-testid="ticket-volume-chart">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Ticket Volume (Past 30 Days)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Daily inbound tickets created over the last 30 calendar days
          </CardDescription>
        </div>

        {/* Summary Chips */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs font-medium text-foreground border border-border">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>Total: <strong className="font-semibold">{totalIn30Days}</strong></span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs font-medium text-foreground border border-border">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span>Avg: <strong className="font-semibold">{dailyAvg}/day</strong></span>
          </div>

          {peakDay && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-xs font-medium text-primary border border-primary/20">
              <Zap className="h-3 w-3" />
              <span>Peak: <strong className="font-semibold">{peakDay.label} ({peakDay.count})</strong></span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 sm:pt-4 px-2 sm:px-6">
        {isLoading ? (
          <div className="h-[220px] sm:h-[260px] w-full flex flex-col justify-end space-y-2">
            <Skeleton className="h-[180px] sm:h-[220px] w-full rounded-md" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : (
          <div className="h-[220px] sm:h-[260px] w-full" data-testid="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 10, right: 10, left: -24, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="label"
                  interval={3}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.25 }} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  fill="var(--primary)"
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
