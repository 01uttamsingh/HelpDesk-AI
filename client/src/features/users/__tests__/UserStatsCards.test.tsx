import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserStatsCards } from "../components/UserStatsCards";

describe("UserStatsCards Component", () => {
  it("renders metric cards with correct counts", () => {
    render(
      <UserStatsCards
        totalCount={25}
        adminCount={5}
        agentCount={20}
        isLoading={false}
      />
    );

    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();

    expect(screen.getByText("Administrators")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Support Agents")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("renders loading indicator when isLoading is true", () => {
    render(
      <UserStatsCards
        totalCount={25}
        adminCount={5}
        agentCount={20}
        isLoading={true}
      />
    );

    const loadingEllipses = screen.getAllByText("...");
    expect(loadingEllipses).toHaveLength(3);
  });
});
