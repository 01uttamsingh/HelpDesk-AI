import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TicketRepliesThread } from "../components/TicketRepliesThread";
import type { TicketItem, TicketReplyItem } from "../types";

const mockTicket: TicketItem = {
  id: 101,
  subject: "Trouble setting up database",
  body: "I am having an issue with Postgres connection.",
  senderName: "Alice Student",
  senderEmail: "alice@example.com",
  status: "OPEN",
  priority: "HIGH",
  createdAt: "2026-09-08T10:00:00.000Z",
  updatedAt: "2026-09-08T10:00:00.000Z",
};

const mockReplies: TicketReplyItem[] = [
  {
    id: 1,
    ticketId: 101,
    userId: "user-agent-1",
    user: {
      id: "user-agent-1",
      name: "Support Sarah",
      email: "sarah@helpdesk.com",
      role: "AGENT",
    },
    senderType: "AGENT",
    body: "Hi Alice, can you verify your port number is 5433?",
    createdAt: "2026-09-08T10:15:00.000Z",
    updatedAt: "2026-09-08T10:15:00.000Z",
  },
  {
    id: 2,
    ticketId: 101,
    userId: null,
    user: null,
    senderType: "CUSTOMER",
    body: "Thanks Sarah, that fixed it! The port was set to 5432.",
    createdAt: "2026-09-08T10:30:00.000Z",
    updatedAt: "2026-09-08T10:30:00.000Z",
  },
  {
    id: 3,
    ticketId: 101,
    userId: "user-admin-1",
    user: {
      id: "user-admin-1",
      name: "Admin Bob",
      email: "bob@helpdesk.com",
      role: "ADMIN",
    },
    senderType: "AGENT",
    body: "Glad to hear that. Closing this ticket.",
    createdAt: "2026-09-08T10:45:00.000Z",
    updatedAt: "2026-09-08T10:45:00.000Z",
  },
];

describe("TicketRepliesThread", () => {
  it("renders empty state when there are no replies", () => {
    render(<TicketRepliesThread ticket={mockTicket} replies={[]} />);

    expect(screen.getByTestId("no-replies-message")).toBeInTheDocument();
    expect(screen.getByText("No replies yet")).toBeInTheDocument();
    expect(screen.getByText(/Conversation Thread \(0\)/)).toBeInTheDocument();
  });

  it("renders agent replies with author name, role badge, email, and message body", () => {
    render(<TicketRepliesThread ticket={mockTicket} replies={[mockReplies[0]]} />);

    expect(screen.getByTestId("reply-author-1")).toHaveTextContent("Support Sarah");
    expect(screen.getByTestId("reply-role-badge-1")).toHaveTextContent("Agent");
    expect(screen.getByText("sarah@helpdesk.com")).toBeInTheDocument();
    expect(screen.getByTestId("reply-body-1")).toHaveTextContent(
      "Hi Alice, can you verify your port number is 5433?"
    );
    expect(screen.getByTestId("reply-timestamp-1")).toBeInTheDocument();
  });

  it("renders customer replies using ticket senderName, senderEmail, and customer badge", () => {
    render(<TicketRepliesThread ticket={mockTicket} replies={[mockReplies[1]]} />);

    expect(screen.getByTestId("reply-author-2")).toHaveTextContent("Alice Student");
    expect(screen.getByTestId("reply-role-badge-2")).toHaveTextContent("Customer");
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("reply-body-2")).toHaveTextContent(
      "Thanks Sarah, that fixed it! The port was set to 5432."
    );
  });

  it("renders admin replies with Admin badge", () => {
    render(<TicketRepliesThread ticket={mockTicket} replies={[mockReplies[2]]} />);

    expect(screen.getByTestId("reply-author-3")).toHaveTextContent("Admin Bob");
    expect(screen.getByTestId("reply-role-badge-3")).toHaveTextContent("Admin");
  });

  it("renders multiple replies in the conversation thread", () => {
    render(<TicketRepliesThread ticket={mockTicket} replies={mockReplies} />);

    expect(screen.getByText(/Conversation Thread \(3\)/)).toBeInTheDocument();
    expect(screen.getByTestId("replies-thread")).toBeInTheDocument();
    expect(screen.getByTestId("reply-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("reply-item-2")).toBeInTheDocument();
    expect(screen.getByTestId("reply-item-3")).toBeInTheDocument();
  });
});
