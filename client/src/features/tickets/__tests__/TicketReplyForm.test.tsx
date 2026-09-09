import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketReplyForm } from "../components/TicketReplyForm";
import { AuthContext } from "@/features/auth";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/renderWithQuery";

describe("TicketReplyForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("renders reply form with textarea, status select, and submit button", () => {
    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    expect(screen.getByTestId("ticket-reply-form-card")).toBeInTheDocument();
    expect(screen.getByTestId("reply-body-input")).toBeInTheDocument();
    expect(screen.getByTestId("reply-status-select")).toBeInTheDocument();
    expect(screen.getByTestId("polish-reply-button")).toBeInTheDocument();
    expect(screen.getByTestId("submit-reply-button")).toBeInTheDocument();
    expect(screen.getByText("Polish")).toBeInTheDocument();
    expect(screen.getByText("Keep current (OPEN)")).toBeInTheDocument();
  });

  it("shows validation error when attempting to submit an empty reply", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "post");

    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    await user.click(screen.getByTestId("submit-reply-button"));

    expect(screen.getByTestId("reply-validation-error")).toHaveTextContent(
      "Reply message cannot be empty."
    );
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("clears validation error when user begins typing", async () => {
    const user = userEvent.setup();

    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    await user.click(screen.getByTestId("submit-reply-button"));
    expect(screen.getByTestId("reply-validation-error")).toBeInTheDocument();

    await user.type(screen.getByTestId("reply-body-input"), "Hello");
    expect(screen.queryByTestId("reply-validation-error")).not.toBeInTheDocument();
  });

  it("submits reply successfully and clears the textarea", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 1,
          ticketId: 101,
          userId: "user-agent-1",
          senderType: "AGENT",
          body: "We have checked your issue.",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: {
            id: "user-agent-1",
            name: "Agent Sarah",
            email: "sarah@example.com",
            role: "AGENT",
          },
        },
      },
    });

    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    const textarea = screen.getByTestId("reply-body-input");
    await user.type(textarea, "We have checked your issue.");
    await user.click(screen.getByTestId("submit-reply-button"));

    expect(postSpy).toHaveBeenCalledWith("/api/tickets/101/replies", {
      body: "We have checked your issue.",
      status: undefined,
    });

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("submits reply with updated status when a status is selected", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 2,
          ticketId: 101,
          userId: "user-agent-1",
          senderType: "AGENT",
          body: "Problem solved!",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    await user.type(screen.getByTestId("reply-body-input"), "Problem solved!");
    await user.selectOptions(screen.getByTestId("reply-status-select"), "RESOLVED");
    await user.click(screen.getByTestId("submit-reply-button"));

    expect(postSpy).toHaveBeenCalledWith("/api/tickets/101/replies", {
      body: "Problem solved!",
      status: "RESOLVED",
    });
  });

  it("displays error alert when submitting reply fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockRejectedValueOnce(new Error("Network connection error"));

    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    await user.type(screen.getByTestId("reply-body-input"), "My reply message");
    await user.click(screen.getByTestId("submit-reply-button"));

    await waitFor(() => {
      expect(screen.getByTestId("reply-error-alert")).toBeInTheDocument();
      expect(screen.getByText("Network connection error")).toBeInTheDocument();
    });
  });

  it("disables reply form and displays closed message when currentStatus is CLOSED", () => {
    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="CLOSED" />);

    expect(screen.getByTestId("ticket-closed-reply-disabled")).toBeInTheDocument();
    expect(screen.getByText("This ticket is closed")).toBeInTheDocument();
    expect(
      screen.getByText(/New replies cannot be added to a closed ticket/i)
    ).toBeInTheDocument();

    expect(screen.queryByTestId("ticket-reply-form-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("reply-body-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("polish-reply-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("submit-reply-button")).not.toBeInTheDocument();
  });

  it("shows validation error when attempting to polish an empty reply", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "post");

    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    await user.click(screen.getByTestId("polish-reply-button"));

    expect(screen.getByTestId("reply-validation-error")).toHaveTextContent(
      "Reply message cannot be empty."
    );
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("polishes reply draft successfully and updates the textarea content", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          polishedText: "Thank you for contacting us. We have carefully reviewed your issue and deployed a fix.",
        },
      },
    });

    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    const textarea = screen.getByTestId("reply-body-input");
    await user.type(textarea, "we checked issue and fixed it");
    await user.click(screen.getByTestId("polish-reply-button"));

    expect(postSpy).toHaveBeenCalledWith("/api/tickets/101/polish-reply", {
      text: "we checked issue and fixed it",
    });

    await waitFor(() => {
      expect(textarea).toHaveValue(
        "Thank you for contacting us. We have carefully reviewed your issue and deployed a fix."
      );
    });
  });

  it("displays error alert when polishing reply fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "post").mockRejectedValueOnce(new Error("AI service unavailable"));

    renderWithQuery(<TicketReplyForm ticketId={101} currentStatus="OPEN" />);

    await user.type(screen.getByTestId("reply-body-input"), "Draft message");
    await user.click(screen.getByTestId("polish-reply-button"));

    await waitFor(() => {
      expect(screen.getByTestId("reply-error-alert")).toBeInTheDocument();
      expect(screen.getByText("AI service unavailable")).toBeInTheDocument();
    });
  });

  it("includes agent name in the polish request when user session is active", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          polishedText:
            "Thank you for contacting us. We have reviewed your request.\n\nRegards,\nAgent Sarah",
        },
      },
    });

    const mockSession = {
      user: {
        id: "1",
        name: "Agent Sarah",
        email: "sarah@example.com",
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      session: {
        id: "s1",
        userId: "1",
        expiresAt: new Date().toISOString(),
        token: "tok",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    renderWithQuery(
      <AuthContext.Provider
        value={{
          data: mockSession,
          isPending: false,
          error: null,
          refetch: async () => {},
        }}
      >
        <TicketReplyForm ticketId={101} currentStatus="OPEN" />
      </AuthContext.Provider>
    );

    const textarea = screen.getByTestId("reply-body-input");
    await user.type(textarea, "reviewed your request");
    await user.click(screen.getByTestId("polish-reply-button"));

    expect(postSpy).toHaveBeenCalledWith("/api/tickets/101/polish-reply", {
      text: "reviewed your request",
      agentName: "Agent Sarah",
    });

    await waitFor(() => {
      expect(textarea).toHaveValue(
        "Thank you for contacting us. We have reviewed your request.\n\nRegards,\nAgent Sarah"
      );
    });
  });

  it("includes customer name and agent name in polish request and displays greeting & sign-off", async () => {
    const user = userEvent.setup();
    const postSpy = vi.spyOn(api, "post").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          polishedText:
            "Dear John,\n\nThank you for contacting us. We have reviewed your request.\n\nRegards,\nAgent Sarah",
        },
      },
    });

    const mockSession = {
      user: {
        id: "1",
        name: "Agent Sarah",
        email: "sarah@example.com",
        emailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      session: {
        id: "s1",
        userId: "1",
        expiresAt: new Date().toISOString(),
        token: "tok",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    renderWithQuery(
      <AuthContext.Provider
        value={{
          data: mockSession,
          isPending: false,
          error: null,
          refetch: async () => {},
        }}
      >
        <TicketReplyForm ticketId={101} currentStatus="OPEN" customerName="John Doe" />
      </AuthContext.Provider>
    );

    const textarea = screen.getByTestId("reply-body-input");
    await user.type(textarea, "reviewed your request");
    await user.click(screen.getByTestId("polish-reply-button"));

    expect(postSpy).toHaveBeenCalledWith("/api/tickets/101/polish-reply", {
      text: "reviewed your request",
      agentName: "Agent Sarah",
      customerName: "John Doe",
    });

    await waitFor(() => {
      expect(textarea).toHaveValue(
        "Dear John,\n\nThank you for contacting us. We have reviewed your request.\n\nRegards,\nAgent Sarah"
      );
    });
  });
});
