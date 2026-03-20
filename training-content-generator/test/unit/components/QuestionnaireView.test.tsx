import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QuestionnaireView } from "../../../src/components/QuestionnaireView";
import { sampleQuestionnaire, sampleResponses } from "../../fixtures";

const { fetchQuestionnaireMock, submitQuestionnaireResponseMock } = vi.hoisted(
  () => ({
    fetchQuestionnaireMock: vi.fn(),
    submitQuestionnaireResponseMock: vi.fn(),
  })
);

vi.mock("../../../src/api/client", () => ({
  fetchQuestionnaire: fetchQuestionnaireMock,
  submitQuestionnaireResponse: submitQuestionnaireResponseMock,
}));

describe("QuestionnaireView", () => {
  beforeEach(() => {
    fetchQuestionnaireMock.mockReset();
    submitQuestionnaireResponseMock.mockReset();
  });

  function renderView() {
    return render(
      <MemoryRouter initialEntries={["/questionnaire/questionnaire-1"]}>
        <Routes>
          <Route path="/questionnaire/:id" element={<QuestionnaireView />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("loads a questionnaire and submits answers", async () => {
    const user = userEvent.setup();
    fetchQuestionnaireMock.mockResolvedValue(sampleQuestionnaire);
    submitQuestionnaireResponseMock.mockResolvedValue(sampleResponses[0]);

    renderView();

    await screen.findByText(sampleQuestionnaire.title);
    expect(screen.getByText("4 questions total")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/you@company.com/i), "alex@example.com");

    const answerButtons = await screen.findAllByRole("button");
    await user.click(answerButtons.find((button) => button.textContent?.includes("Context, blockers"))!);
    await user.click(answerButtons.find((button) => button.textContent?.includes("As soon as they are known"))!);
    await user.click(answerButtons.find((button) => button.textContent?.includes("Written decisions"))!);
    await user.click(answerButtons.find((button) => button.textContent?.includes("Triage the issue"))!);

    await user.click(screen.getByRole("button", { name: /submit assessment/i }));

    await waitFor(() => {
      expect(submitQuestionnaireResponseMock).toHaveBeenCalledWith(
        "questionnaire-1",
        "alex@example.com",
        { "0": 1, "1": 2, "2": 2, "3": 1 }
      );
    });

    expect(screen.getByText(/great job!/i)).toBeInTheDocument();
    expect(screen.getByText(/your responses have been recorded/i)).toBeInTheDocument();
  });

  it("shows a not-found state when loading fails", async () => {
    fetchQuestionnaireMock.mockRejectedValue(new Error("Questionnaire not found"));

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/assessment not found/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Questionnaire not found")).toBeInTheDocument();
  });

  it("validates email input and surfaces submit errors", async () => {
    const user = userEvent.setup();
    fetchQuestionnaireMock.mockResolvedValue(sampleQuestionnaire);
    submitQuestionnaireResponseMock.mockRejectedValue(new Error("Submission failed"));

    renderView();

    await screen.findByText(sampleQuestionnaire.title);

    const submitButton = screen.getByRole("button", { name: /submit assessment/i });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/you@company.com/i), "not-an-email");
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/you@company.com/i));
    await user.type(screen.getByPlaceholderText(/you@company.com/i), "alex@example.com");
    await user.click(screen.getByRole("button", { name: "Context, blockers, and next steps" }));
    await user.click(screen.getByRole("button", { name: "As soon as they are known" }));
    await user.click(screen.getByRole("button", { name: "Written decisions" }));
    await user.click(screen.getByRole("button", { name: "Triage the issue" }));

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Submission failed")).toBeInTheDocument();
    });
    expect(submitQuestionnaireResponseMock).toHaveBeenCalled();
  });

  it("shows the retry-oriented result for a low score", async () => {
    const user = userEvent.setup();
    fetchQuestionnaireMock.mockResolvedValue(sampleQuestionnaire);
    submitQuestionnaireResponseMock.mockResolvedValue({
      ...sampleResponses[0],
      score: 1,
      totalQuestions: 4,
    });

    renderView();

    await screen.findByText(sampleQuestionnaire.title);
    await user.type(screen.getByPlaceholderText(/you@company.com/i), "alex@example.com");
    await user.click(screen.getByRole("button", { name: "Only wins" }));
    await user.click(screen.getByRole("button", { name: "At the deadline" }));
    await user.click(screen.getByRole("button", { name: "Assumptions" }));
    await user.click(screen.getByRole("button", { name: "Ignore alerts" }));
    await user.click(screen.getByRole("button", { name: /submit assessment/i }));

    await waitFor(() => {
      expect(screen.getByText(/keep learning!/i)).toBeInTheDocument();
    });
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText(/review your answers/i)).toBeInTheDocument();
  });
});
