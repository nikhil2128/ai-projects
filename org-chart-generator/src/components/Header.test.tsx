import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "./Header";

describe("Header", () => {
  it("renders the app name and tagline", () => {
    render(<Header hasChart={false} onReset={vi.fn()} />);
    expect(screen.getByText("OrgVision")).toBeInTheDocument();
    expect(
      screen.getByText("AI-powered org chart generator"),
    ).toBeInTheDocument();
  });

  it("does not show New Chart button when hasChart is false", () => {
    render(<Header hasChart={false} onReset={vi.fn()} />);
    expect(screen.queryByText("New Chart")).not.toBeInTheDocument();
  });

  it("shows New Chart button when hasChart is true", () => {
    render(<Header hasChart={true} onReset={vi.fn()} />);
    expect(screen.getByText("New Chart")).toBeInTheDocument();
  });

  it("calls onReset when New Chart is clicked", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<Header hasChart={true} onReset={onReset} />);

    await user.click(screen.getByText("New Chart"));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("renders as a sticky header element", () => {
    render(<Header hasChart={false} onReset={vi.fn()} />);
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("sticky");
  });
});
