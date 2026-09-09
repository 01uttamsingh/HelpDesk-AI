import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketVolumeChart } from "../components/TicketVolumeChart";
import type { DailyTicketCount } from "../types";

// Mock recharts ResponsiveContainer to render children with explicit dimensions in jsdom
vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 260 }}>{children}</div>
    ),
  };
});

const mockData: DailyTicketCount[] = [
  { date: "2026-09-07", label: "Sep 07", count: 4 },
  { date: "2026-09-08", label: "Sep 08", count: 10 },
  { date: "2026-09-09", label: "Sep 09", count: 6 },
];

describe("TicketVolumeChart", () => {
  it("renders chart title and calculates 30-day summary metrics (Total, Avg, Peak)", () => {
    render(<TicketVolumeChart data={mockData} isLoading={false} />);

    expect(screen.getByText("Ticket Volume (Past 30 Days)")).toBeInTheDocument();

    // Total: 4 + 10 + 6 = 20
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();

    // Avg: 20 / 3 = 6.7
    expect(screen.getByText(/Avg:/)).toBeInTheDocument();
    expect(screen.getByText("6.7/day")).toBeInTheDocument();

    // Peak: Sep 08 (10)
    expect(screen.getByText(/Peak:/)).toBeInTheDocument();
    expect(screen.getByText("Sep 08 (10)")).toBeInTheDocument();
  });

  it("handles empty data gracefully", () => {
    render(<TicketVolumeChart data={[]} isLoading={false} />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("0.0/day")).toBeInTheDocument();
  });

  it("renders skeleton loading state when isLoading is true", () => {
    const { container } = render(<TicketVolumeChart data={[]} isLoading={true} />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
