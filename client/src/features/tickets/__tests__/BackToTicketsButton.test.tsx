import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQuery } from "@/test/renderWithQuery";
import { BackToTicketsButton } from "../components/BackToTicketsButton";

describe("BackToTicketsButton", () => {
  it("renders with default props linking to /tickets", () => {
    renderWithQuery(<BackToTicketsButton />);

    const button = screen.getByTestId("back-to-tickets-btn");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Back to Tickets");

    const link = button.closest("a");
    expect(link).toHaveAttribute("href", "/tickets");
  });

  it("supports custom testId, variant, and size", () => {
    renderWithQuery(
      <BackToTicketsButton testId="custom-back-btn" variant="outline" size="lg" />
    );

    const button = screen.getByTestId("custom-back-btn");
    expect(button).toBeInTheDocument();
  });
});
