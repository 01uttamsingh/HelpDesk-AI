import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle Component", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("renders theme toggle button with accessible title and aria-label", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByTestId("theme-toggle");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
  });

  it("toggles between light and dark mode on click", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByTestId("theme-toggle");

    // Initially light
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");

    // Click to switch to dark
    await user.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    expect(localStorage.getItem("helpdesk-theme")).toBe("dark");

    // Click again to switch back to light
    await user.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    expect(localStorage.getItem("helpdesk-theme")).toBe("light");
  });

  it("renders label when showLabel is true", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle showLabel />
      </ThemeProvider>
    );

    expect(screen.getByText("Light mode")).toBeInTheDocument();
  });
});
