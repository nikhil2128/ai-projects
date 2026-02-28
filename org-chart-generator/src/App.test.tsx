import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

vi.mock("./utils/api", () => ({
  parseOrgChartImage: vi.fn(),
}));

vi.mock("./utils/download", () => ({
  downloadAsPng: vi.fn().mockResolvedValue(undefined),
  downloadAsSvg: vi.fn().mockResolvedValue(undefined),
}));

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mock("./utils/api", () => ({
      parseOrgChartImage: vi.fn(),
    }));
    vi.mock("./utils/download", () => ({
      downloadAsPng: vi.fn().mockResolvedValue(undefined),
      downloadAsSvg: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it("renders in idle state with header and upload area", () => {
    render(<App />);
    expect(screen.getByText("OrgVision")).toBeInTheDocument();
    expect(screen.getByText("Drop your screenshot here")).toBeInTheDocument();
    expect(screen.queryByText("New Chart")).not.toBeInTheDocument();
  });

  it("shows org chart after successful parse", async () => {
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: true,
      data: { name: "Alice", title: "CEO", children: [] },
    });

    render(<App />);
    const input = document.querySelector("input[type='file']")!;
    const file = new File(["img"], "chart.png", { type: "image/png" });

    Object.defineProperty(input, "files", { value: [file] });
    const event = new Event("drop", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { files: [file], types: ["Files"] },
    });
    input.dispatchEvent(event);

    await waitFor(() => {
      expect(parseOrgChartImage).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    expect(screen.getByText("New Chart")).toBeInTheDocument();
  });

  it("shows error state when parse returns error", async () => {
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: false,
      error: "Could not read the handwriting",
    });

    render(<App />);
    const input = document.querySelector("input[type='file']")!;
    const file = new File(["img"], "chart.png", { type: "image/png" });

    Object.defineProperty(input, "files", { value: [file] });
    const event = new Event("drop", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { files: [file], types: ["Files"] },
    });
    input.dispatchEvent(event);

    await waitFor(() => {
      expect(
        screen.getByText("Could not read the handwriting"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Unable to parse the image")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("shows error state when parse throws", async () => {
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockRejectedValue(
      new Error("Network failure"),
    );

    render(<App />);
    const input = document.querySelector("input[type='file']")!;
    const file = new File(["img"], "chart.png", { type: "image/png" });

    Object.defineProperty(input, "files", { value: [file] });
    const event = new Event("drop", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { files: [file], types: ["Files"] },
    });
    input.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeInTheDocument();
    });
  });

  it("shows generic error when exception is not an Error instance", async () => {
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockRejectedValue("string error");

    render(<App />);
    const input = document.querySelector("input[type='file']")!;
    const file = new File(["img"], "chart.png", { type: "image/png" });

    Object.defineProperty(input, "files", { value: [file] });
    const event = new Event("drop", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { files: [file], types: ["Files"] },
    });
    input.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("resets to idle when Try Again is clicked", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: false,
      error: "Parse failed",
    });

    render(<App />);
    const input = document.querySelector("input[type='file']")!;
    const file = new File(["img"], "chart.png", { type: "image/png" });

    Object.defineProperty(input, "files", { value: [file] });
    const event = new Event("drop", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { files: [file], types: ["Files"] },
    });
    input.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Try Again"));
    expect(screen.getByText("Drop your screenshot here")).toBeInTheDocument();
  });

  it("resets from ready state via New Chart button", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: true,
      data: { name: "Alice", title: "CEO" },
    });

    render(<App />);
    const input = document.querySelector("input[type='file']")!;
    const file = new File(["img"], "chart.png", { type: "image/png" });

    Object.defineProperty(input, "files", { value: [file] });
    const event = new Event("drop", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { files: [file], types: ["Files"] },
    });
    input.dispatchEvent(event);

    await waitFor(() => {
      expect(screen.getByText("New Chart")).toBeInTheDocument();
    });

    await user.click(screen.getByText("New Chart"));
    expect(screen.getByText("Drop your screenshot here")).toBeInTheDocument();
  });

  it("falls back to default error message when result has no error", async () => {
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: false,
    });

    render(<App />);
    const input = document.querySelector("input[type='file']")!;
    const file = new File(["img"], "chart.png", { type: "image/png" });

    Object.defineProperty(input, "files", { value: [file] });
    const event = new Event("drop", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { files: [file], types: ["Files"] },
    });
    input.dispatchEvent(event);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to parse org chart"),
      ).toBeInTheDocument();
    });
  });
});
