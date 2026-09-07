import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { CreateUserModal } from "../components/CreateUserModal";
import { api } from "@/lib/api";
import { renderWithQuery, createTestQueryClient } from "@/test/renderWithQuery";

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

describe("CreateUserModal Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  describe("1. Visibility & Rendering", () => {
    it("renders modal dialog, heading, and input fields when isOpen is true", () => {
      renderWithQuery(<CreateUserModal isOpen={true} onClose={vi.fn()} />);

      expect(
        screen.getByRole("heading", { name: "Create New User" })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Add a new team member to your helpdesk platform.")
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^create user$/i })).toBeInTheDocument();
    });

    it("does not render modal dialog contents when isOpen is false", () => {
      renderWithQuery(<CreateUserModal isOpen={false} onClose={vi.fn()} />);

      expect(
        screen.queryByRole("heading", { name: "Create New User" })
      ).not.toBeInTheDocument();
    });
  });

  describe("2. Dismissal Handlers", () => {
    it("calls onClose when clicking the Cancel button", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      renderWithQuery(<CreateUserModal isOpen={true} onClose={handleClose} />);

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelBtn);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when pressing the Escape key", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      renderWithQuery(<CreateUserModal isOpen={true} onClose={handleClose} />);

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it("calls onClose when clicking outside on the backdrop", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();

      renderWithQuery(<CreateUserModal isOpen={true} onClose={handleClose} />);

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

      renderWithQuery(<CreateUserModal isOpen={true} onClose={vi.fn()} />);

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

      renderWithQuery(<CreateUserModal isOpen={true} onClose={vi.fn()} />);

      await user.type(screen.getByLabelText("Name"), "Al");
      await user.type(screen.getByLabelText("Email"), "alice@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");

      await user.click(screen.getByRole("button", { name: /^create user$/i }));

      expect(
        await screen.findByText("Name must be at least 3 characters")
      ).toBeInTheDocument();
    });

    it("displays validation error when Email format is invalid", async () => {
      const user = userEvent.setup();

      renderWithQuery(<CreateUserModal isOpen={true} onClose={vi.fn()} />);

      await user.type(screen.getByLabelText("Name"), "Alice Admin");
      await user.type(screen.getByLabelText("Email"), "invalid-email-address");
      await user.type(screen.getByLabelText("Password"), "password123");

      await user.click(screen.getByRole("button", { name: /^create user$/i }));

      expect(
        await screen.findByText("Please enter a valid email address")
      ).toBeInTheDocument();
    });

    it("displays validation error when Password is fewer than 8 characters", async () => {
      const user = userEvent.setup();

      renderWithQuery(<CreateUserModal isOpen={true} onClose={vi.fn()} />);

      await user.type(screen.getByLabelText("Name"), "Alice Admin");
      await user.type(screen.getByLabelText("Email"), "alice@example.com");
      await user.type(screen.getByLabelText("Password"), "short1");

      await user.click(screen.getByRole("button", { name: /^create user$/i }));

      expect(
        await screen.findByText("Password must be at least 8 characters")
      ).toBeInTheDocument();
    });
  });

  describe("5. Submission & API Handling", () => {
    it("submits valid form data to /api/users, invalidates users query, and calls onClose", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const postSpy = vi.spyOn(api, "post").mockResolvedValue({
        data: {
          success: true,
          data: {
            id: "new-user-id",
            name: "John Agent",
            email: "john@example.com",
            role: "AGENT",
            emailVerified: false,
            image: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      });

      const queryClient = createTestQueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      renderWithQuery(
        <CreateUserModal isOpen={true} onClose={handleClose} />,
        queryClient
      );

      await user.type(screen.getByLabelText("Name"), "John Agent");
      await user.type(screen.getByLabelText("Email"), "john@example.com");
      await user.type(screen.getByLabelText("Password"), "securePassword123");

      await user.click(screen.getByRole("button", { name: /^create user$/i }));

      await waitFor(() => {
        expect(postSpy).toHaveBeenCalledWith("/api/users", {
          name: "John Agent",
          email: "john@example.com",
          password: "securePassword123",
        });
      });

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
      });

      await waitFor(() => {
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it("displays server error message when API call returns an error", async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      vi.spyOn(api, "post").mockRejectedValue(
        createAxiosError(409, "Conflict", "A user with this email already exists")
      );

      renderWithQuery(<CreateUserModal isOpen={true} onClose={handleClose} />);

      await user.type(screen.getByLabelText("Name"), "Existing User");
      await user.type(screen.getByLabelText("Email"), "existing@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");

      await user.click(screen.getByRole("button", { name: /^create user$/i }));

      expect(
        await screen.findByText("A user with this email already exists")
      ).toBeInTheDocument();

      // Modal should remain open
      expect(handleClose).not.toHaveBeenCalled();
    });
  });
});
