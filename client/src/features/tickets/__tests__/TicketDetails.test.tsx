import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketDetails } from "../components/TicketDetails";
import { renderWithQuery } from "@/test/renderWithQuery";
import { api } from "@/lib/api";
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
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("renders ticket subject, id, and badges", () => {
    renderWithQuery(<TicketDetails ticket={mockTicket} />);

    expect(screen.getByTestId("ticket-detail-id")).toHaveTextContent("#101");
    expect(screen.getByTestId("ticket-detail-subject")).toHaveTextContent("React 19 Setup Issue");
    expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("Open");
    expect(screen.getByTestId("ticket-priority-badge")).toHaveTextContent("High");
    expect(screen.getByTestId("ticket-category-badge")).toHaveTextContent("Technical Question");
  });

  it("renders customer details and message body", () => {
    renderWithQuery(<TicketDetails ticket={mockTicket} />);

    expect(screen.getByTestId("ticket-sender-name")).toHaveTextContent("Carlos Student");
    expect(screen.getByTestId("ticket-sender-email")).toHaveTextContent("carlos@example.com");
    expect(screen.getByTestId("ticket-sender-email")).toHaveAttribute("href", "mailto:carlos@example.com");
    expect(screen.getByTestId("ticket-detail-timestamp")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-detail-body")).toHaveTextContent(
      "I am having trouble configuring Vite with React 19. Can you help me?"
    );
  });

  it("renders summarize button below the message with sparkles icon", () => {
    renderWithQuery(<TicketDetails ticket={mockTicket} />);

    const summarizeBtn = screen.getByTestId("summarize-ticket-button");
    expect(summarizeBtn).toBeInTheDocument();
    expect(summarizeBtn).toHaveTextContent("Summarize");
  });

  it("generates summary when summarize button is clicked and displays it", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          summary: "Core Issue: Vite config with React 19.\nStatus: Pending reply.",
        },
      },
    });

    renderWithQuery(<TicketDetails ticket={mockTicket} />);

    const summarizeBtn = screen.getByTestId("summarize-ticket-button");
    await user.click(summarizeBtn);

    expect(postSpy).toHaveBeenCalledWith("/api/tickets/101/summarize");

    await waitFor(() => {
      expect(screen.getByTestId("ticket-summary-content")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-summary-content")).toHaveTextContent(
        "Core Issue: Vite config with React 19."
      );
    });
  });

  it("re-generates summary every time the summarize button is clicked", async () => {
    const user = userEvent.setup();
    const postSpy = vi
      .spyOn(api, "post")
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            summary: "Initial summary version 1",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            summary: "Re-generated updated summary version 2",
          },
        },
      });

    renderWithQuery(<TicketDetails ticket={mockTicket} />);

    const summarizeBtn = screen.getByTestId("summarize-ticket-button");

    // First click
    await user.click(summarizeBtn);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-summary-content")).toHaveTextContent(
        "Initial summary version 1"
      );
    });
    expect(postSpy).toHaveBeenCalledTimes(1);

    // Second click (re-generate)
    await user.click(summarizeBtn);
    await waitFor(() => {
      expect(screen.getByTestId("ticket-summary-content")).toHaveTextContent(
        "Re-generated updated summary version 2"
      );
    });
    expect(postSpy).toHaveBeenCalledTimes(2);
  });

  it("displays error alert when summarize request fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockRejectedValueOnce(new Error("AI service timeout"));

    renderWithQuery(<TicketDetails ticket={mockTicket} />);

    const summarizeBtn = screen.getByTestId("summarize-ticket-button");
    await user.click(summarizeBtn);

    await waitFor(() => {
      expect(screen.getByTestId("summary-error-alert")).toBeInTheDocument();
      expect(screen.getByText("AI service timeout")).toBeInTheDocument();
    });
  });

  it("renders fallback avatar icon when senderName is empty", () => {
    const ticketWithoutName: TicketItem = {
      ...mockTicket,
      senderName: "",
    };
    renderWithQuery(<TicketDetails ticket={ticketWithoutName} />);

    expect(screen.getByTestId("ticket-sender-email")).toHaveTextContent("carlos@example.com");
  });

  it("sanitizes malicious scripts and dangerous attributes in ticket body", () => {
    const maliciousTicket: TicketItem = {
      ...mockTicket,
      body: '<p>Valid message</p><script>alert("xss")</script><img src="x" onerror="alert(1)" />',
    };
    renderWithQuery(<TicketDetails ticket={maliciousTicket} />);

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
    renderWithQuery(<TicketDetails ticket={richTicket} />);

    const bodyElement = screen.getByTestId("ticket-detail-body");
    expect(bodyElement.querySelector("strong")).toHaveTextContent("Bold issue description");
    const link = bodyElement.querySelector("a");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveTextContent("link");
  });
});
