import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareModal } from "../../../src/components/ShareModal";
import { sampleModules, sampleQuestionnaire } from "../../fixtures";

const { createQuestionnaireMock, shareQuestionnaireMock } = vi.hoisted(() => ({
  createQuestionnaireMock: vi.fn(),
  shareQuestionnaireMock: vi.fn(),
}));

vi.mock("../../../src/api/client", () => ({
  createQuestionnaire: createQuestionnaireMock,
  shareQuestionnaire: shareQuestionnaireMock,
}));

describe("ShareModal", () => {
  beforeEach(() => {
    createQuestionnaireMock.mockReset();
    shareQuestionnaireMock.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("parses bulk email input and shares the questionnaire", async () => {
    const user = userEvent.setup();
    createQuestionnaireMock.mockResolvedValue(sampleQuestionnaire);
    shareQuestionnaireMock.mockResolvedValue({
      sent: ["alex@example.com"],
      failed: ["jamie@example.com"],
    });

    render(<ShareModal modules={sampleModules} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /paste multiple/i }));
    await user.type(
      screen.getByRole("textbox"),
      "alex@example.com; jamie@example.com; invalid"
    );
    await user.click(screen.getByRole("button", { name: /parse emails/i }));

    expect(screen.getByText("2 valid emails")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /share assessment/i }));

    await waitFor(() => {
      expect(createQuestionnaireMock).toHaveBeenCalledWith(
        "Team Communication, Incident Response",
        sampleModules
      );
      expect(shareQuestionnaireMock).toHaveBeenCalledWith("questionnaire-1", [
        "alex@example.com",
        "jamie@example.com",
      ]);
    });

    expect(screen.getByText(/assessment shared!/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /copy questionnaire link/i }));
    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: /copy questionnaire link/i })
          .querySelector('[data-icon="ClipboardCheck"]')
      ).not.toBeNull();
      expect(
        screen.getByDisplayValue("http://localhost:3000/questionnaire/questionnaire-1")
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /view responses/i })).toHaveAttribute(
      "href",
      "/responses/questionnaire-1"
    );
  });

  it("returns to the email step when sharing fails", async () => {
    const user = userEvent.setup();
    createQuestionnaireMock.mockRejectedValue(new Error("Unable to share"));

    render(<ShareModal modules={sampleModules} onClose={vi.fn()} />);

    await user.type(
      screen.getByPlaceholderText(/employee@company.com/i),
      "alex@example.com"
    );
    await user.click(screen.getByRole("button", { name: /share assessment/i }));

    await waitFor(() => {
      expect(screen.getByText("Unable to share")).toBeInTheDocument();
    });
    expect(screen.getByText(/1 valid email/i)).toBeInTheDocument();
  });

  it("supports adding, removing, and cancelling bulk email entry", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<ShareModal modules={sampleModules} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /add another email/i }));
    expect(screen.getAllByPlaceholderText(/employee@company.com/i)).toHaveLength(2);

    await user.click(screen.getAllByRole("button").find((button) => {
      return button.querySelector('[data-icon="Trash2"]') !== null;
    })!);
    expect(screen.getAllByPlaceholderText(/employee@company.com/i)).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /paste multiple/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("button", { name: /paste multiple/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close share modal/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
