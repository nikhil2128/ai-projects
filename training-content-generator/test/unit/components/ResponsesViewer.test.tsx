import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ResponsesViewer } from "../../../src/components/ResponsesViewer";
import { sampleQuestionnaire, sampleResponses } from "../../fixtures";

const { fetchQuestionnaireMock, fetchResponsesMock } = vi.hoisted(() => ({
  fetchQuestionnaireMock: vi.fn(),
  fetchResponsesMock: vi.fn(),
}));

vi.mock("../../../src/api/client", () => ({
  fetchQuestionnaire: fetchQuestionnaireMock,
  fetchResponses: fetchResponsesMock,
}));

describe("ResponsesViewer", () => {
  beforeEach(() => {
    fetchQuestionnaireMock.mockReset();
    fetchResponsesMock.mockReset();
  });

  function renderView() {
    return render(
      <MemoryRouter initialEntries={["/responses/questionnaire-1"]}>
        <Routes>
          <Route path="/responses/:id" element={<ResponsesViewer />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("loads response stats and supports refresh", async () => {
    const user = userEvent.setup();
    fetchQuestionnaireMock.mockResolvedValue(sampleQuestionnaire);
    fetchResponsesMock.mockResolvedValue(sampleResponses);

    renderView();

    await screen.findByText(sampleQuestionnaire.title);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /refresh/i }));
    await waitFor(() => {
      expect(fetchResponsesMock).toHaveBeenCalledTimes(2);
    });
  });

  it("renders an error state when data loading fails", async () => {
    fetchQuestionnaireMock.mockRejectedValue(new Error("Unable to load"));
    fetchResponsesMock.mockResolvedValue([]);

    renderView();

    await waitFor(() => {
      expect(screen.getByText("Unable to load")).toBeInTheDocument();
    });
  });

  it("renders the empty state when no responses exist", async () => {
    fetchQuestionnaireMock.mockResolvedValue(sampleQuestionnaire);
    fetchResponsesMock.mockResolvedValue([]);

    renderView();

    await screen.findByText(sampleQuestionnaire.title);
    expect(screen.getByText(/no responses yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/responses will appear here as employees complete the assessment/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
