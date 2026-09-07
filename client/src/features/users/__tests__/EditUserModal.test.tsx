import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { EditUserModal } from "../components/EditUserModal";
import { api } from "@/lib/api";
import { renderWithQuery, createTestQueryClient } from "@/test/renderWithQuery";
import type { UserItem } from "../types";

const mockUser: UserItem = {
  id: "user-123",
  name: "John Agent",
  email: "john.agent@example.com",
  role: "AGENT",
  emailVerified: true,
  image: null,
  createdAt: "2026-01-10T00:00:00.000Z",
  updatedAt: "2026-01-10T00:00:00.000Z",
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

describe("EditUserModal Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe("1. Visibility & Pre-population", () => {
    it("renders modal dialog, heading, and pre-populates name and email fields", () => {
      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={vi.fn()} />
      );

      expect(
        screen.getByRole("heading", { name: "Edit User" })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Update team member details or change their password.")
      ).toBeInTheDocument();

      const nameInput = screen.getByLabelText("Name");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");

      expect(nameInput).toHaveValue("John Agent");
      expect(emailInput).toHaveValue("john.agent@example.com");
      expect(passwordInput).toHaveValue("");
      expect(passwordInput).toHaveAttribute(
        "placeholder",
        "Leave blank to keep current password"
      );
    });

    it("does not render modal dialog contents when isOpen is false", () => {
      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={false} onClose={vi.fn()} />
      );

      expect(
        screen.queryByRole("heading", { name: "Edit User" })
      ).not.toBeInTheDocument();
    });
  });

  describe("2. Dismissal Handlers", () => {
    it("calls onClose when clicking the Cancel button", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={handleClose} />
      );

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when pressing the Escape key", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={handleClose} />
      );

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it("calls onClose when clicking outside on the backdrop", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={handleClose} />
      );

      const backdrop = document.querySelector('[data-slot="dialog-backdrop"]');
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop as HTMLElement);

      await waitFor(() => {
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("3. Password Toggle", () => {
    it("toggles password field visibility between password and text", async () => {
      const user = userEvent.setup();

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={vi.fn()} />
      );

      const passwordInput = screen.getByLabelText("Password");
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = screen.getByRole("button", { name: "Show password" });
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Hide password" }));
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  describe("4. Form Validation", () => {
    it("displays validation error when Name is fewer than 3 characters", async () => {
      const user = userEvent.setup();

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={vi.fn()} />
      );

      const nameInput = screen.getByLabelText("Name");
      await user.clear(nameInput);
      await user.type(nameInput, "Ab");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        await screen.findByText("Name must be at least 3 characters")
      ).toBeInTheDocument();
    });

    it("displays validation error when Email is invalid", async () => {
      const user = userEvent.setup();

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={vi.fn()} />
      );

      const emailInput = screen.getByLabelText("Email");
      await user.clear(emailInput);
      await user.type(emailInput, "not-a-valid-email");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        await screen.findByText("Please enter a valid email address")
      ).toBeInTheDocument();
    });

    it("displays validation error when Password is entered but fewer than 8 characters", async () => {
      const user = userEvent.setup();

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={vi.fn()} />
      );

      const passwordInput = screen.getByLabelText("Password");
      await user.type(passwordInput, "short1");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        await screen.findByText("Password must be at least 8 characters")
      ).toBeInTheDocument();
    });
  });

  describe("5. Submission & API Handling", () => {
    it("submits updated details without password when password field is left empty", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const patchSpy = vi.spyOn(api, "patch").mockResolvedValue({
        data: {
          success: true,
          data: { ...mockUser, name: "John Senior Agent" },
        },
      });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={handleClose} />,
        queryClient
      );

      const nameInput = screen.getByLabelText("Name");
      await user.clear(nameInput);
      await user.type(nameInput, "John Senior Agent");

      // Leave password blank
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(patchSpy).toHaveBeenCalledWith(`/api/users/${mockUser.id}`, {
          name: "John Senior Agent",
          email: "john.agent@example.com",
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
      });

      await waitFor(() => {
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it("submits updated details with new password when password field is populated", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const patchSpy = vi.spyOn(api, "patch").mockResolvedValue({
        data: {
          success: true,
          data: { ...mockUser, name: "John Agent" },
        },
      });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={handleClose} />,
        queryClient
      );

      const passwordInput = screen.getByLabelText("Password");
      await user.type(passwordInput, "NewSecurePassword123");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(patchSpy).toHaveBeenCalledWith(`/api/users/${mockUser.id}`, {
          name: "John Agent",
          email: "john.agent@example.com",
          password: "NewSecurePassword123",
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
      });

      await waitFor(() => {
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it("displays server error message when API returns an error", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      vi.spyOn(api, "patch").mockRejectedValue(
        createAxiosError(409, "Conflict", "A user with this email already exists")
      );

      renderWithQuery(
        <EditUserModal user={mockUser} isOpen={true} onClose={handleClose} />
      );

      const emailInput = screen.getByLabelText("Email");
      await user.clear(emailInput);
      await user.type(emailInput, "taken@example.com");

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(
        await screen.findByText("A user with this email already exists")
      ).toBeInTheDocument();

      // Modal remains open on error
      expect(handleClose).not.toHaveBeenCalled();
    });
  });
});
