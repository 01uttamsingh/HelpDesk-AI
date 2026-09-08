import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "@/test/renderWithQuery";
import userEvent from "@testing-library/user-event";
import { UpdateTicket } from "../components/UpdateTicket";
import type { TicketItem, TicketAssignedUser } from "../types";

const mockTicket: TicketItem = {
  id: 101,
  subject: "React 19 Setup Issue",
  body: "I am having trouble configuring Vite with React 19.",
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

const mockAssignees: TicketAssignedUser[] = [
  { id: "agent-1", name: "Agent Alex", email: "alex@example.com", role: "AGENT" },
  { id: "admin-1", name: "Admin Sam", email: "sam@example.com", role: "ADMIN" },
];

describe("UpdateTicket", () => {
  it("renders status, priority, category, assignees, dates, and customer info", () => {
    renderWithQuery(
      <UpdateTicket
        ticket={mockTicket}
        assignees={mockAssignees}
        isLoadingAssignees={false}
        isUpdating={false}
        updateVariables={undefined}
        updateError={null}
        onUpdateTicket={vi.fn()}
        isAssigning={false}
        assignError={null}
        onAssignTicket={vi.fn()}
      />
    );

    expect(screen.getByTestId("ticket-info-card")).toBeInTheDocument();
    expect(screen.getByTestId("status-select")).toHaveValue("OPEN");
    expect(screen.getByTestId("category-select")).toHaveValue("TECHNICAL_QUESTION");
    expect(screen.getByTestId("assignee-select")).toHaveValue("");
    expect(screen.getByTestId("assigned-agent-unassigned")).toHaveTextContent("Unassigned");
    expect(screen.getByTestId("ticket-created-at")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-updated-at")).toBeInTheDocument();

    expect(screen.getByTestId("ticket-customer-card")).toBeInTheDocument();
    expect(screen.getByText("Carlos Student")).toBeInTheDocument();
    expect(screen.getByText("carlos@example.com")).toBeInTheDocument();
  });

  it("calls onUpdateTicket when changing status", async () => {
    const user = userEvent.setup();
    const handleUpdate = vi.fn();

    renderWithQuery(
      <UpdateTicket
        ticket={mockTicket}
        assignees={mockAssignees}
        isLoadingAssignees={false}
        isUpdating={false}
        updateVariables={undefined}
        updateError={null}
        onUpdateTicket={handleUpdate}
        isAssigning={false}
        assignError={null}
        onAssignTicket={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByTestId("status-select"), "RESOLVED");
    expect(handleUpdate).toHaveBeenCalledWith({ status: "RESOLVED" });
  });

  it("calls onUpdateTicket when changing category", async () => {
    const user = userEvent.setup();
    const handleUpdate = vi.fn();

    renderWithQuery(
      <UpdateTicket
        ticket={mockTicket}
        assignees={mockAssignees}
        isLoadingAssignees={false}
        isUpdating={false}
        updateVariables={undefined}
        updateError={null}
        onUpdateTicket={handleUpdate}
        isAssigning={false}
        assignError={null}
        onAssignTicket={vi.fn()}
      />
    );

    await user.selectOptions(screen.getByTestId("category-select"), "REFUND_REQUEST");
    expect(handleUpdate).toHaveBeenCalledWith({ category: "REFUND_REQUEST" });
  });

  it("calls onAssignTicket when selecting an agent", async () => {
    const user = userEvent.setup();
    const handleAssign = vi.fn();

    renderWithQuery(
      <UpdateTicket
        ticket={mockTicket}
        assignees={mockAssignees}
        isLoadingAssignees={false}
        isUpdating={false}
        updateVariables={undefined}
        updateError={null}
        onUpdateTicket={vi.fn()}
        isAssigning={false}
        assignError={null}
        onAssignTicket={handleAssign}
      />
    );

    await user.selectOptions(screen.getByTestId("assignee-select"), "agent-1");
    expect(handleAssign).toHaveBeenCalledWith("agent-1");
  });

  it("renders update error and assign error messages when present", () => {
    renderWithQuery(
      <UpdateTicket
        ticket={mockTicket}
        assignees={mockAssignees}
        isLoadingAssignees={false}
        isUpdating={false}
        updateVariables={undefined}
        updateError={new Error("Failed to update ticket")}
        onUpdateTicket={vi.fn()}
        isAssigning={false}
        assignError={new Error("Failed to assign ticket")}
        onAssignTicket={vi.fn()}
      />
    );

    expect(screen.getByTestId("ticket-update-error")).toHaveTextContent("Failed to update ticket.");
    expect(screen.getByTestId("assign-error-message")).toHaveTextContent("Failed to update assignment.");
  });
});
