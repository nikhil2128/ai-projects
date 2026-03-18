import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewToggle } from "./ViewToggle";
import { renderWithProviders } from "../test/helpers";

describe("ViewToggle", () => {
  it("renders grid and list buttons", () => {
    renderWithProviders(<ViewToggle />);

    expect(screen.getByLabelText("Grid view")).toBeInTheDocument();
    expect(screen.getByLabelText("List view")).toBeInTheDocument();
  });

  it("shows grid as active by default", () => {
    renderWithProviders(<ViewToggle />);

    expect(screen.getByLabelText("Grid view")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("List view")).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to list view when list button clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ViewToggle />);

    await user.click(screen.getByLabelText("List view"));

    expect(screen.getByLabelText("List view")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Grid view")).toHaveAttribute("aria-pressed", "false");
  });

  it("switches back to grid view", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ViewToggle />);

    await user.click(screen.getByLabelText("List view"));
    await user.click(screen.getByLabelText("Grid view"));

    expect(screen.getByLabelText("Grid view")).toHaveAttribute("aria-pressed", "true");
  });

  it("persists view mode to localStorage", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ViewToggle />);

    await user.click(screen.getByLabelText("List view"));
    expect(localStorage.getItem("viewMode")).toBe("list");
  });
});
