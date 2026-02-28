import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UploadArea from "./UploadArea";

function createFile(name = "chart.png", type = "image/png") {
  return new File(["fake-image-data"], name, { type });
}

describe("UploadArea", () => {
  it("renders upload instructions in idle state", () => {
    render(<UploadArea onFileSelected={vi.fn()} isProcessing={false} />);
    expect(screen.getByText("Drop your screenshot here")).toBeInTheDocument();
    expect(screen.getByText("or click to browse files")).toBeInTheDocument();
    expect(screen.getByText("PNG, JPG, WEBP supported")).toBeInTheDocument();
  });

  it("renders the heading text", () => {
    render(<UploadArea onFileSelected={vi.fn()} isProcessing={false} />);
    expect(
      screen.getByText("Turn handwritten org charts"),
    ).toBeInTheDocument();
    expect(screen.getByText("into beautiful visuals")).toBeInTheDocument();
  });

  it("shows processing state with spinner text", () => {
    render(<UploadArea onFileSelected={vi.fn()} isProcessing={true} />);
    expect(
      screen.getByText("Analyzing your org chart..."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("AI is reading the handwritten structure"),
    ).toBeInTheDocument();
  });

  it("shows the three step labels", () => {
    render(<UploadArea onFileSelected={vi.fn()} isProcessing={false} />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("AI Parses")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
  });

  it("calls onFileSelected when a file is dropped", async () => {
    const onFileSelected = vi.fn();
    render(
      <UploadArea onFileSelected={onFileSelected} isProcessing={false} />,
    );

    const input = document.querySelector("input[type='file']")!;
    const file = createFile();

    Object.defineProperty(input, "files", { value: [file] });
    fireEvent.drop(input, {
      dataTransfer: { files: [file], types: ["Files"] },
    });

    await waitFor(() => {
      expect(onFileSelected).toHaveBeenCalledWith(file);
    });
  });

  it("has a file input that accepts images", () => {
    render(<UploadArea onFileSelected={vi.fn()} isProcessing={false} />);
    const input = document.querySelector("input[type='file']");
    expect(input).toBeTruthy();
    expect(input?.getAttribute("accept")).toContain("image/*");
  });
});
