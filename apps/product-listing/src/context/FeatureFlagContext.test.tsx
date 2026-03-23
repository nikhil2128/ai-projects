import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeatureFlagProvider, useFeatureFlags } from "./FeatureFlagContext";

function TestConsumer() {
  const { viewMode, toggleViewMode, setViewMode } = useFeatureFlags();
  return (
    <div>
      <span data-testid="mode">{viewMode}</span>
      <button onClick={toggleViewMode}>Toggle</button>
      <button onClick={() => setViewMode("list")}>Set List</button>
      <button onClick={() => setViewMode("grid")}>Set Grid</button>
    </div>
  );
}

describe("FeatureFlagContext", () => {
  it("provides default grid view mode", () => {
    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("grid");
  });

  it("reads initial view mode from localStorage", () => {
    localStorage.setItem("viewMode", "list");

    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("list");
  });

  it("toggles view mode and persists to localStorage", async () => {
    const user = userEvent.setup();

    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent("grid");

    await user.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("mode")).toHaveTextContent("list");
    expect(localStorage.getItem("viewMode")).toBe("list");

    await user.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("mode")).toHaveTextContent("grid");
    expect(localStorage.getItem("viewMode")).toBe("grid");
  });

  it("sets view mode directly", async () => {
    const user = userEvent.setup();

    render(
      <FeatureFlagProvider>
        <TestConsumer />
      </FeatureFlagProvider>,
    );

    await user.click(screen.getByText("Set List"));
    expect(screen.getByTestId("mode")).toHaveTextContent("list");
    expect(localStorage.getItem("viewMode")).toBe("list");

    await user.click(screen.getByText("Set Grid"));
    expect(screen.getByTestId("mode")).toHaveTextContent("grid");
    expect(localStorage.getItem("viewMode")).toBe("grid");
  });

  it("throws when useFeatureFlags is used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useFeatureFlags must be used within a FeatureFlagProvider",
    );

    consoleSpy.mockRestore();
  });
});
