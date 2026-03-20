import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TopicItem } from "../../../src/types";
import { sampleModules } from "../../fixtures";

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock("../../../src/api/client", () => ({
  generateContent: generateContentMock,
}));

vi.mock("../../../src/components/ImageUpload", () => ({
  ImageUpload: ({
    onTopicsExtracted,
  }: {
    onTopicsExtracted: (topics: string[], preview: string) => void;
  }) => (
    <button onClick={() => onTopicsExtracted(["Alpha", "Beta"], "blob:preview")}>
      Mock Upload
    </button>
  ),
}));

vi.mock("../../../src/components/TopicManager", () => ({
  TopicManager: ({
    topics,
    onTopicsChange,
    onGenerate,
  }: {
    topics: TopicItem[];
    onTopicsChange: (topics: TopicItem[]) => void;
    onGenerate: () => void;
  }) => (
    <div>
      <p>Topic count: {topics.length}</p>
      <button onClick={() => onTopicsChange([{ id: "manual", text: "Manual Topic" }])}>
        Add Manual Topic
      </button>
      <button onClick={onGenerate}>Run Generate</button>
    </div>
  ),
}));

vi.mock("../../../src/components/TrainingViewer", () => ({
  TrainingViewer: ({ modules }: { modules: typeof sampleModules }) => (
    <div>Rendered modules: {modules.length}</div>
  ),
}));

import App from "../../../src/App";

describe("App", () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it("starts manual entry from the home view", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /enter topics manually/i }));

    expect(screen.getByText("Topic count: 0")).toBeInTheDocument();
  });

  it("moves from extracted topics to generated content", async () => {
    const user = userEvent.setup();
    generateContentMock.mockResolvedValue(sampleModules);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /mock upload/i }));
    expect(screen.getByText("Topic count: 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /run generate/i }));

    await waitFor(() => {
      expect(screen.getByText("Rendered modules: 2")).toBeInTheDocument();
    });
    expect(generateContentMock).toHaveBeenCalledWith(["Alpha", "Beta"]);
  });

  it("shows errors and supports back navigation", async () => {
    const user = userEvent.setup();
    generateContentMock.mockRejectedValue(new Error("API unavailable"));

    render(<App />);

    await user.click(screen.getByRole("button", { name: /enter topics manually/i }));
    await user.click(screen.getByRole("button", { name: /add manual topic/i }));
    await user.click(screen.getByRole("button", { name: /run generate/i }));

    await waitFor(() => {
      expect(screen.getByText("API unavailable")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /go back/i }));
    expect(screen.getByRole("button", { name: /enter topics manually/i })).toBeInTheDocument();
  });

  it("returns from generated content to the topic editor", async () => {
    const user = userEvent.setup();
    generateContentMock.mockResolvedValue(sampleModules);

    render(<App />);

    await user.click(screen.getByRole("button", { name: /mock upload/i }));
    await user.click(screen.getByRole("button", { name: /run generate/i }));

    await waitFor(() => {
      expect(screen.getByText("Rendered modules: 2")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /go back/i }));
    expect(screen.getByText("Topic count: 2")).toBeInTheDocument();
  });

  it("uses the default generation error for non-Error failures", async () => {
    const user = userEvent.setup();
    generateContentMock.mockRejectedValue("unexpected");

    render(<App />);

    await user.click(screen.getByRole("button", { name: /enter topics manually/i }));
    await user.click(screen.getByRole("button", { name: /add manual topic/i }));
    await user.click(screen.getByRole("button", { name: /run generate/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to generate content")).toBeInTheDocument();
    });
  });
});
