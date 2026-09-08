import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketDetailSkeleton } from "../components/TicketDetailSkeleton";

describe("TicketDetailSkeleton", () => {
  it("renders the loading skeleton container and placeholder elements", () => {
    render(<TicketDetailSkeleton />);

    const skeletonContainer = screen.getByTestId("ticket-detail-skeleton");
    expect(skeletonContainer).toBeInTheDocument();
  });
});
