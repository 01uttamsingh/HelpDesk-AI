import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import { TicketDetailPage } from "../pages/TicketDetailPage";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/renderWithQuery";
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

const mockTicketWithAssignee: TicketItem = {
  ...mockTicket,
  id: 102,
  subject: "Billing Issue",
  body: "Need help with double billing on my subscription.",
  category: "REFUND_REQUEST",
  status: "RESOLVED",
  priority: "MEDIUM",
  assignedToId: "user-agent-1",
  assignedTo: {
    id: "user-agent-1",
    name: "Support Agent Sarah",
    email: "sarah@example.com",
    role: "AGENT",
  },
};

function renderTicketDetail(route = "/tickets/101") {
  return renderWithQuery(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
      <Route path="/tickets" element={<div>Tickets List Page</div>} />
    </Routes>,
    undefined,
    { route }
  );
}

describe("TicketDetailPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("renders loading skeleton initially while ticket is fetching", () => {
    vi.spyOn(api, "get").mockImplementation(() => new Promise(() => {})); // Never resolves

    renderTicketDetail("/tickets/101");

    expect(screen.getByTestId("ticket-detail-skeleton")).toBeInTheDocument();
  });

  it("renders full ticket details when ticket is successfully fetched", async () => {
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: { success: true, data: mockTicket },
    });

    renderTicketDetail("/tickets/101");

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-subject")).toHaveTextContent("React 19 Setup Issue");
    });

    // ID Badge
    expect(screen.getByTestId("ticket-detail-id")).toHaveTextContent("#101");

    // Status, Priority, Category Badges
    const statusBadges = screen.getAllByTestId("ticket-status-badge");
    expect(statusBadges.length).toBeGreaterThan(0);
    expect(statusBadges[0]).toHaveTextContent("Open");

    const priorityBadges = screen.getAllByTestId("ticket-priority-badge");
    expect(priorityBadges.length).toBeGreaterThan(0);
    expect(priorityBadges[0]).toHaveTextContent("High");

    const categoryBadges = screen.getAllByTestId("ticket-category-badge");
    expect(categoryBadges.length).toBeGreaterThan(0);
    expect(categoryBadges[0]).toHaveTextContent("Technical Question");

    // Customer / Message details
    expect(screen.getByTestId("ticket-sender-name")).toHaveTextContent("Carlos Student");
    expect(screen.getByTestId("ticket-sender-email")).toHaveTextContent("carlos@example.com");
    expect(screen.getByTestId("ticket-sender-email")).toHaveAttribute("href", "mailto:carlos@example.com");
    expect(screen.getByTestId("ticket-detail-body")).toHaveTextContent(
      "I am having trouble configuring Vite with React 19. Can you help me?"
    );

    // Unassigned agent state
    expect(screen.getByTestId("assigned-agent-unassigned")).toHaveTextContent("Unassigned");

    // Timestamps
    expect(screen.getByTestId("ticket-created-at")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-updated-at")).toBeInTheDocument();
  });

  it("renders assigned agent details when ticket has an assigned user", async () => {
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: { success: true, data: mockTicketWithAssignee },
    });

    renderTicketDetail("/tickets/102");

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-subject")).toHaveTextContent("Billing Issue");
    });

    expect(screen.getByTestId("assigned-agent-name")).toHaveTextContent("Support Agent Sarah");
    expect(screen.getAllByTestId("ticket-category-badge")[0]).toHaveTextContent("Refund Request");
    expect(screen.getAllByTestId("ticket-status-badge")[0]).toHaveTextContent("Resolved");
  });

  it("renders Not Found state when ticket does not exist (404)", async () => {
    const error = new AxiosError("Request failed with status code 404", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { success: false, error: "Ticket not found" },
    });
    vi.spyOn(api, "get").mockRejectedValueOnce(error);

    renderTicketDetail("/tickets/999");

    await waitFor(() => {
      expect(screen.getByTestId("ticket-not-found")).toBeInTheDocument();
    });

    expect(screen.getByText("Ticket Not Found")).toBeInTheDocument();
    expect(screen.getByTestId("back-to-tickets-btn")).toBeInTheDocument();
  });

  it("renders Not Found state when ticket id is invalid (non-numeric)", async () => {
    renderTicketDetail("/tickets/not-a-number");

    expect(screen.getByTestId("ticket-not-found")).toBeInTheDocument();
    expect(screen.getByText("The ticket ID provided in the URL is invalid.")).toBeInTheDocument();
  });

  it("renders error alert with retry button on server failure (500)", async () => {
    const user = userEvent.setup();
    const error = new AxiosError("Internal Server Error", "ERR_BAD_RESPONSE", undefined, undefined, {
      status: 500,
      statusText: "Internal Server Error",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { success: false, error: "Internal database failure" },
    });
    const getSpy = vi.spyOn(api, "get").mockRejectedValueOnce(error);

    renderTicketDetail("/tickets/101");

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Internal database failure")).toBeInTheDocument();

    // Mock successful retry
    getSpy.mockResolvedValueOnce({
      data: { success: true, data: mockTicket },
    });

    const retryBtn = screen.getByTestId("retry-load-ticket");
    await user.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-subject")).toHaveTextContent("React 19 Setup Issue");
    });
  });

  it("navigates back to tickets list when clicking back link", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: { success: true, data: mockTicket },
    });

    renderTicketDetail("/tickets/101");

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-subject")).toBeInTheDocument();
    });

    const backLink = screen.getByTestId("back-to-tickets");
    await user.click(backLink);

    expect(screen.getByText("Tickets List Page")).toBeInTheDocument();
  });

  it("refetches ticket details when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(api, "get").mockResolvedValue({
      data: { success: true, data: mockTicket },
    });

    renderTicketDetail("/tickets/101");

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-subject")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTestId("refresh-ticket-button");
    await user.click(refreshBtn);

    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
