import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ErrorBoundary from "../../components/ErrorBoundary";

function ThrowingComponent({ error }: { error?: boolean }) {
  if (error) throw new Error("Test error");
  return <div>Working content</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Working content")).toBeInTheDocument();
  });

  it("renders default fallback on error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent error />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred/)
    ).toBeInTheDocument();
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent error />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom error UI")).toBeInTheDocument();
  });

  it("logs error info to console", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingComponent error />
      </ErrorBoundary>
    );
    expect(consoleSpy).toHaveBeenCalled();
    const firstArg = consoleSpy.mock.calls.find(
      (call) => call[0] === "ErrorBoundary caught:"
    );
    expect(firstArg).toBeDefined();
  });

  it("calls window.location.reload when refresh button is clicked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    const user = (await import("@testing-library/user-event")).default.setup();

    render(
      <ErrorBoundary>
        <ThrowingComponent error />
      </ErrorBoundary>
    );

    await user.click(screen.getByText("Refresh Page"));
    expect(reloadMock).toHaveBeenCalled();
  });
});
