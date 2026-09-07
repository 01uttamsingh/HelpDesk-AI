import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { DeleteUserModal } from "../components/DeleteUserModal";
import type { UserItem } from "../types";
import { api } from "@/lib/api";
import { renderWithQuery } from "@/test/renderWithQuery";

const mockAgentUser: UserItem = {
  id: "user-2",
  name: "Bob Agent",
  email: "bob.agent@example.com",
  role: "AGENT",
  emailVerified: false,
  image: null,
  createdAt: "2026-02-20T15:30:00.000Z",
  updatedAt: "2026-02-20T15:30:00.000Z",
};

function createAxiosError(status: number, message: string, serverError?: string) {
  return new AxiosError(
    message,
    status.toString(),
    undefined,
    undefined,
    {
      status,
      statusText: message,
      data: { success: false, error: serverError || message },
      headers: {},
      config: { headers: new AxiosHeaders() },
    }
  );
}

describe("DeleteUserModal Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("does not render modal contents when isOpen is false", () => {
    renderWithQuery(
      <DeleteUserModal
        user={mockAgentUser}
        isOpen={false}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole("heading", { name: "Delete User" })).not.toBeInTheDocument();
  });

  it("renders user details and warning confirmation when isOpen is true", () => {
    renderWithQuery(
      <DeleteUserModal
        user={mockAgentUser}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Delete User" })).toBeInTheDocument();
    expect(screen.getByText("Bob Agent")).toBeInTheDocument();
    expect(screen.getByText("(bob.agent@example.com)? This user will be deactivated and removed from the platform.", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete User" })).toBeInTheDocument();
  });

  it("calls onClose when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    renderWithQuery(
      <DeleteUserModal
        user={mockAgentUser}
        isOpen={true}
        onClose={handleClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    renderWithQuery(
      <DeleteUserModal
        user={mockAgentUser}
        isOpen={true}
        onClose={handleClose}
      />
    );

    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    renderWithQuery(
      <DeleteUserModal
        user={mockAgentUser}
        isOpen={true}
        onClose={handleClose}
      />
    );

    const backdrop = document.querySelector('[data-slot="dialog-backdrop"]');
    expect(backdrop).toBeInTheDocument();

    await user.click(backdrop as HTMLElement);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("calls DELETE /api/users/:id and onClose on confirm", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const deleteSpy = vi.spyOn(api, "delete").mockResolvedValue({
      data: { success: true, message: "User deleted successfully" },
    });

    renderWithQuery(
      <DeleteUserModal
        user={mockAgentUser}
        isOpen={true}
        onClose={handleClose}
      />
    );

    const confirmButton = screen.getByRole("button", { name: "Delete User" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(`/api/users/${mockAgentUser.id}`);
    });

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it("displays server error message when deletion fails", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    vi.spyOn(api, "delete").mockRejectedValue(
      createAxiosError(400, "Bad Request", "Administrators cannot be deleted")
    );

    renderWithQuery(
      <DeleteUserModal
        user={mockAgentUser}
        isOpen={true}
        onClose={handleClose}
      />
    );

    const confirmButton = screen.getByRole("button", { name: "Delete User" });
    await user.click(confirmButton);

    expect(
      await screen.findByText("Administrators cannot be deleted")
    ).toBeInTheDocument();
    expect(screen.getByText("Deletion Failed")).toBeInTheDocument();

    // Modal remains open on error
    expect(handleClose).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Delete User" })).toBeInTheDocument();
  });
});
