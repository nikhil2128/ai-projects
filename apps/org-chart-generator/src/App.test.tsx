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

vi.mock("./utils/storage", () => ({
  getAllDocuments: vi.fn().mockReturnValue([]),
  getDocument: vi.fn().mockReturnValue(null),
  saveDocument: vi.fn(),
  deleteDocument: vi.fn(),
  generateId: vi.fn().mockReturnValue("mock-id"),
}));

async function navigateToUpload(user: ReturnType<typeof userEvent.setup>) {
  const newChartButtons = screen.getAllByText("New Chart");
  await user.click(newChartButtons[0]);
}

async function uploadFile(file: File) {
  const input = document.querySelector("input[type='file']")!;
  Object.defineProperty(input, "files", { value: [file] });
  const event = new Event("drop", { bubbles: true });
  Object.defineProperty(event, "dataTransfer", {
    value: { files: [file], types: ["Files"] },
  });
  input.dispatchEvent(event);
}

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
    vi.mock("./utils/storage", () => ({
      getAllDocuments: vi.fn().mockReturnValue([]),
      getDocument: vi.fn().mockReturnValue(null),
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
      generateId: vi.fn().mockReturnValue("mock-id"),
    }));
  });

  it("renders home view with header and saved charts list", () => {
    render(<App />);
    expect(screen.getByText("OrgVision")).toBeInTheDocument();
    expect(screen.getByText("Saved Charts")).toBeInTheDocument();
  });

  it("navigates to upload when New Chart is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await navigateToUpload(user);
    expect(screen.getByText("Drop your screenshot here")).toBeInTheDocument();
  });

  it("shows org chart after successful parse", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: true,
      data: { name: "Alice", title: "CEO", children: [] },
    });

    render(<App />);
    await navigateToUpload(user);

    const file = new File(["img"], "chart.png", { type: "image/png" });
    await uploadFile(file);

    await waitFor(() => {
      expect(parseOrgChartImage).toHaveBeenCalledWith(file);
    });

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("shows error state when parse returns error", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: false,
      error: "Could not read the handwriting",
    });

    render(<App />);
    await navigateToUpload(user);

    const file = new File(["img"], "chart.png", { type: "image/png" });
    await uploadFile(file);

    await waitFor(() => {
      expect(
        screen.getByText("Could not read the handwriting"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Unable to parse the image")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("shows error state when parse throws", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockRejectedValue(
      new Error("Network failure"),
    );

    render(<App />);
    await navigateToUpload(user);

    const file = new File(["img"], "chart.png", { type: "image/png" });
    await uploadFile(file);

    await waitFor(() => {
      expect(screen.getByText("Network failure")).toBeInTheDocument();
    });
  });

  it("shows generic error when exception is not an Error instance", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockRejectedValue("string error");

    render(<App />);
    await navigateToUpload(user);

    const file = new File(["img"], "chart.png", { type: "image/png" });
    await uploadFile(file);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  it("resets to upload view when Try Again is clicked", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: false,
      error: "Parse failed",
    });

    render(<App />);
    await navigateToUpload(user);

    const file = new File(["img"], "chart.png", { type: "image/png" });
    await uploadFile(file);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Try Again"));
    expect(screen.getByText("Drop your screenshot here")).toBeInTheDocument();
  });

  it("navigates back to home from editing view", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: true,
      data: { name: "Alice", title: "CEO" },
    });

    render(<App />);
    await navigateToUpload(user);

    const file = new File(["img"], "chart.png", { type: "image/png" });
    await uploadFile(file);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Back to charts"));
    expect(screen.getByText("Saved Charts")).toBeInTheDocument();
  });

  it("falls back to default error message when result has no error", async () => {
    const user = userEvent.setup();
    const { parseOrgChartImage } = await import("./utils/api");
    vi.mocked(parseOrgChartImage).mockResolvedValue({
      success: false,
    });

    render(<App />);
    await navigateToUpload(user);

    const file = new File(["img"], "chart.png", { type: "image/png" });
    await uploadFile(file);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to parse org chart"),
      ).toBeInTheDocument();
    });
  });
});
