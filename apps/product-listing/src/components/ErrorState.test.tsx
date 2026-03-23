import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("displays the error message", () => {
    render(<ErrorState message="Network error" onRetry={() => {}} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders a retry button", () => {
    render(<ErrorState message="Error" onRetry={() => {}} />);

    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("calls onRetry when button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ErrorState message="Error" onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
