import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { AuthContext, type AuthContextType } from "../context/AuthContext";
const mockSignInEmail = vi.fn();
vi.mock("../lib/auth-client", () => ({
  signIn: {
    email: (...args: any[]) => mockSignInEmail(...args),
  },
  signOut: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("LoginPage Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("renders login form with email, password, and submit button", () => {
    const defaultAuth: AuthContextType = {
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={defaultAuth}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    expect(screen.getByText("Sign in to Helpdesk")).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sign in$/i })).toBeInTheDocument();
  });

  it("displays validation errors when submitting empty form", async () => {
    const user = userEvent.setup();
    const defaultAuth: AuthContextType = {
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={defaultAuth}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole("button", { name: /^sign in$/i });
    await user.click(submitBtn);

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("displays validation error when submitting malformed email address", async () => {
    const user = userEvent.setup();
    const defaultAuth: AuthContextType = {
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={defaultAuth}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.type(screen.getByLabelText(/^password$/i), "secret123");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument();
  });

  it("toggles password visibility between masked and plain text", async () => {
    const user = userEvent.setup();
    const defaultAuth: AuthContextType = {
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={defaultAuth}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = screen.getByRole("button", { name: "Show password" });
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("displays error alert banner when signIn.email returns an error", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockResolvedValue({
      error: { message: "Invalid email or password. Please try again.", status: 401, statusText: "Unauthorized" },
      data: null,
    });

    const defaultAuth: AuthContextType = {
      data: null,
      isPending: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={defaultAuth}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), "wrong@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Invalid email or password. Please try again.")).toBeInTheDocument();
  });

  it("normalizes email to lowercase, trims whitespace, calls signIn.email and navigates to '/' on success", async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn().mockResolvedValue(undefined);
    mockSignInEmail.mockResolvedValue({
      data: { user: { id: "u-1" }, session: { id: "s-1" } },
      error: null,
    });

    const defaultAuth: AuthContextType = {
      data: null,
      isPending: false,
      error: null,
      refetch: mockRefetch,
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={defaultAuth}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email address/i), "  ADMIN@EXAMPLE.COM  ");
    await user.type(screen.getByLabelText(/^password$/i), "correctpassword");
    await user.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: "admin@example.com",
        password: "correctpassword",
      });
    });

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("redirects to '/' if user session is already active", () => {
    const authenticatedAuth: AuthContextType = {
      data: {
        user: { id: "u-1", name: "Alice", email: "alice@example.com", emailVerified: true, createdAt: "", updatedAt: "" },
        session: { id: "s-1", userId: "u-1", token: "tok", expiresAt: "" },
      },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <MemoryRouter>
        <AuthContext.Provider value={authenticatedAuth}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // Form should not be rendered, user is redirected
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });
});
