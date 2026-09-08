import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketDetails } from "../components/TicketDetails";
import type { TicketItem } from "../types";

const mockTicket: TicketItem = {
  id: 101,
  subject: "React 19 Setup Issue",
  body: "I am having trouble configuring Vite with React 19. Can you help me?",
  senderName: "Carlos Student",
  senderEmail: "carlos@example.com",
  status: "OPEN",
  priority: "HIGH",
  category: "TECHNICAL_QUESTION",
  assignedTo: null,
  assignedToId: null,
  messageId: "msg-12345",
  createdAt: "2026-09-07T14:00:00.000Z",
  updatedAt: "2026-09-07T14:30:00.000Z",
};

describe("TicketDetails", () => {
  it("renders ticket subject, id, and badges", () => {
    render(<TicketDetails ticket={mockTicket} />);

    expect(screen.getByTestId("ticket-detail-id")).toHaveTextContent("#101");
    expect(screen.getByTestId("ticket-detail-subject")).toHaveTextContent("React 19 Setup Issue");
    expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Open");
    expect(screen.getByTestId("ticket-priority-badge")).toHaveTextContent("High");
    expect(screen.getByTestId("ticket-category-badge")).toHaveTextContent("Technical Question");
  });

  it("renders customer details and message body", () => {
    render(<TicketDetails ticket={mockTicket} />);

    expect(screen.getByTestId("ticket-sender-name")).toHaveTextContent("Carlos Student");
    expect(screen.getByTestId("ticket-sender-email")).toHaveTextContent("carlos@example.com");
    expect(screen.getByTestId("ticket-sender-email")).toHaveAttribute("href", "mailto:carlos@example.com");
    expect(screen.getByTestId("ticket-detail-timestamp")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-detail-body")).toHaveTextContent(
      "I am having trouble configuring Vite with React 19. Can you help me?"
    );
  });

  it("renders fallback avatar icon when senderName is empty", () => {
    const ticketWithoutName: TicketItem = {
      ...mockTicket,
      senderName: "",
    };
    render(<TicketDetails ticket={ticketWithoutName} />);

    expect(screen.getByTestId("ticket-sender-email")).toHaveTextContent("carlos@example.com");
  });

  it("sanitizes malicious scripts and dangerous attributes in ticket body", () => {
    const maliciousTicket: TicketItem = {
      ...mockTicket,
      body: '<p>Valid message</p><script>alert("xss")</script><img src="x" onerror="alert(1)" />',
    };
    render(<TicketDetails ticket={maliciousTicket} />);

    const bodyElement = screen.getByTestId("ticket-detail-body");
    expect(bodyElement.innerHTML).toContain("<p>Valid message</p>");
    expect(bodyElement.innerHTML).not.toContain("<script>");
    expect(bodyElement.innerHTML).not.toContain("alert");
    expect(bodyElement.innerHTML).not.toContain("onerror");
  });

  it("safely renders legitimate HTML elements in ticket body", () => {
    const richTicket: TicketItem = {
      ...mockTicket,
      body: '<strong>Bold issue description</strong> with a <a href="https://example.com">link</a>',
    };
    render(<TicketDetails ticket={richTicket} />);

    const bodyElement = screen.getByTestId("ticket-detail-body");
    expect(bodyElement.querySelector("strong")).toHaveTextContent("Bold issue description");
    const link = bodyElement.querySelector("a");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveTextContent("link");
  });
});
