import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecentAssignedTicketsTable } from "../components/RecentAssignedTicketsTable";
import type { RecentAssignedTicketItem } from "../types";

function renderComponent(props: React.ComponentProps<typeof RecentAssignedTicketsTable>) {
  return render(
    <MemoryRouter>
      <RecentAssignedTicketsTable {...props} />
    </MemoryRouter>
  );
}

const mockTickets: RecentAssignedTicketItem[] = [
  {
    id: 101,
    subject: "Cannot connect to VPN",
    body: "I am having troubles accessing internal tools",
    senderName: "Sarah Connor",
    senderEmail: "sarah@cyberdyne.com",
    status: "OPEN",
    priority: "HIGH",
    category: "TECHNICAL_QUESTION",
    createdAt: "2026-09-08T10:00:00.000Z",
    updatedAt: "2026-09-09T08:00:00.000Z",
  },
  {
    id: 102,
    subject: "Billing invoice question",
    body: "Please clarify line item #4",
    senderName: "John Doe",
    senderEmail: "john@example.com",
    status: "RESOLVED",
    priority: "MEDIUM",
    category: "REFUND_REQUEST",
    createdAt: "2026-09-07T12:00:00.000Z",
    updatedAt: "2026-09-08T15:30:00.000Z",
  },
];

describe("RecentAssignedTicketsTable", () => {
  it("renders ticket rows with customer details, status badges, and links", () => {
    renderComponent({ tickets: mockTickets, isLoading: false });

    // Header count
    expect(screen.getByText("2 tickets")).toBeInTheDocument();

    // Ticket rows
    const row1 = screen.getByTestId("recent-ticket-row-101");
    expect(row1).toHaveTextContent("Cannot connect to VPN");
    expect(row1).toHaveTextContent("Sarah Connor");
    expect(row1).toHaveTextContent("sarah@cyberdyne.com");

    const row2 = screen.getByTestId("recent-ticket-row-102");
    expect(row2).toHaveTextContent("Billing invoice question");
    expect(row2).toHaveTextContent("John Doe");
    expect(row2).toHaveTextContent("john@example.com");

    // Check link navigation
    const subjectLink = screen.getByTestId("recent-ticket-subject-101");
    expect(subjectLink).toHaveAttribute("href", "/tickets/101");
  });

  it("renders empty state message when no tickets are assigned", () => {
    renderComponent({ tickets: [], isLoading: false });

    expect(screen.getByTestId("empty-assigned-tickets")).toBeInTheDocument();
    expect(screen.getByText("No tickets assigned to you")).toBeInTheDocument();
    expect(screen.getByText("Browse open tickets")).toBeInTheDocument();
  });

  it("renders skeletons when isLoading is true", () => {
    const { container } = renderComponent({ tickets: [], isLoading: true });
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.getByText("...")).toBeInTheDocument();
  });
});
