import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrainingViewer } from "../../../src/components/TrainingViewer";
import { sampleModules } from "../../fixtures";

const { fetchTopicImagesMock, exportToPPTMock } = vi.hoisted(() => ({
  fetchTopicImagesMock: vi.fn(),
  exportToPPTMock: vi.fn(),
}));

vi.mock("../../../src/api/client", () => ({
  fetchTopicImages: fetchTopicImagesMock,
}));

vi.mock("../../../src/utils/pptExport", () => ({
  exportToPPT: exportToPPTMock,
}));

vi.mock("../../../src/components/ShareModal", () => ({
  ShareModal: ({ onClose }: { onClose: () => void }) => (
    <div>
      <p>Share modal open</p>
      <button onClick={onClose}>Close Share</button>
    </div>
  ),
}));

describe("TrainingViewer", () => {
  beforeEach(() => {
    fetchTopicImagesMock.mockReset();
    exportToPPTMock.mockReset();
  });

  it("navigates between modules and evaluates quiz answers", async () => {
    const user = userEvent.setup();

    render(<TrainingViewer modules={sampleModules} />);

    expect(
      screen.getByRole("heading", { name: "Team Communication", level: 2 })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /next module/i }));
    expect(
      screen.getByRole("heading", { name: "Incident Response", level: 2 })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /triage the issue/i }));
    await user.click(screen.getByRole("button", { name: /check answers/i }));

    expect(screen.getByText("Score:")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(screen.getByRole("button", { name: /check answers/i })).toBeDisabled();
  });

  it("exports a powerpoint using fetched topic images", async () => {
    const user = userEvent.setup();
    fetchTopicImagesMock.mockResolvedValue({
      "Team Communication": "data:image/png;base64,one",
      "Incident Response": "data:image/png;base64,two",
    });
    exportToPPTMock.mockResolvedValue(undefined);

    render(<TrainingViewer modules={sampleModules} />);

    await user.click(screen.getByRole("button", { name: /download ppt/i }));

    await waitFor(() => {
      expect(fetchTopicImagesMock).toHaveBeenCalledWith([
        "Team Communication",
        "Incident Response",
      ]);
      expect(exportToPPTMock).toHaveBeenCalledWith(sampleModules, {
        "Team Communication": "data:image/png;base64,one",
        "Incident Response": "data:image/png;base64,two",
      });
    });
  });

  it("opens and closes the share modal", async () => {
    const user = userEvent.setup();

    render(<TrainingViewer modules={sampleModules} />);

    await user.click(screen.getByRole("button", { name: /share assessment/i }));
    expect(screen.getByText("Share modal open")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close share/i }));
    expect(screen.queryByText("Share modal open")).not.toBeInTheDocument();
  });

  it("handles a failed export and supports collapsing content sections", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchTopicImagesMock.mockResolvedValue({});
    exportToPPTMock.mockRejectedValue(new Error("Export failed"));

    render(<TrainingViewer modules={[sampleModules[0]!]} />);

    expect(screen.queryByRole("button", { name: /next module/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /download ppt/i }));
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "PPT export failed:",
        expect.any(Error)
      );
    });
    expect(screen.getByRole("button", { name: /download ppt/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /1 daily practices/i }));
    expect(
      screen.queryByText(/use clear updates and capture action items/i)
    ).not.toBeInTheDocument();
  });
});
