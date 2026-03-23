import {
  createQuestionnaire,
  extractTopicsFromImage,
  fetchQuestionnaire,
  fetchResponses,
  fetchTopicImages,
  generateContent,
  shareQuestionnaire,
  submitQuestionnaireResponse,
} from "../../../src/api/client";
import { sampleModules, sampleQuestionnaire, sampleResponses } from "../../fixtures";

describe("api client", () => {
  it("returns topic images when the request succeeds", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        images: { teamwork: "data:image/png;base64,abc123" },
      }),
    } as Response);

    await expect(fetchTopicImages(["teamwork"])).resolves.toEqual({
      teamwork: "data:image/png;base64,abc123",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/topic-images", expect.objectContaining({
      method: "POST",
    }));
  });

  it("falls back to an empty image map when topic image lookup fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
    } as Response);

    await expect(fetchTopicImages(["teamwork"])).resolves.toEqual({});
  });

  it("uploads an image and returns extracted topics", async () => {
    const file = new File(["fake-image"], "notes.png", { type: "image/png" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, topics: ["Communication", "Planning"] }),
    } as Response);

    await expect(extractTopicsFromImage(file)).resolves.toEqual([
      "Communication",
      "Planning",
    ]);

    const [, options] = fetchMock.mock.calls[0]!;
    expect(options).toMatchObject({ method: "POST" });
    expect((options as { body: FormData }).body).toBeInstanceOf(FormData);
  });

  it("uses the default extract-topics error message when none is provided", async () => {
    const file = new File(["fake-image"], "notes.png", { type: "image/png" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(extractTopicsFromImage(file)).rejects.toThrow(
      "Failed to extract topics"
    );
  });

  it("throws a server error for failed content generation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Generation failed" }),
    } as Response);

    await expect(generateContent(["topic"])).rejects.toThrow("Generation failed");
  });

  it("returns generated content when the request succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, content: sampleModules, sessionId: "session-1" }),
    } as Response);

    await expect(generateContent(["topic"])).resolves.toEqual({
      modules: sampleModules,
      sessionId: "session-1",
    });
  });

  it("uses the default generation error message when the payload has no message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(generateContent(["topic"])).rejects.toThrow(
      "Failed to generate content"
    );
  });

  it("creates a questionnaire using assessment questions from each module", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, questionnaire: sampleQuestionnaire }),
    } as Response);

    await expect(
      createQuestionnaire("Assessment", sampleModules)
    ).resolves.toEqual(sampleQuestionnaire);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/questionnaires",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Assessment",
          sessionId: undefined,
          modules: sampleModules.map((module) => ({
            topic: module.topic,
            questions: module.assessmentQuestions,
          })),
        }),
      })
    );
  });

  it("uses the default questionnaire creation error message when none is returned", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    await expect(createQuestionnaire("Assessment", sampleModules)).rejects.toThrow(
      "Failed to create questionnaire"
    );
  });

  it("fetches and submits questionnaire data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, questionnaire: sampleQuestionnaire }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: sampleResponses }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, response: sampleResponses[0] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, sent: ["alex@example.com"], failed: [] }),
      } as Response);

    await expect(fetchQuestionnaire("questionnaire-1")).resolves.toEqual(sampleQuestionnaire);
    await expect(fetchResponses("questionnaire-1")).resolves.toEqual(sampleResponses);
    await expect(
      submitQuestionnaireResponse("questionnaire-1", "alex@example.com", {
        "0": 1,
      })
    ).resolves.toEqual(sampleResponses[0]);
    await expect(shareQuestionnaire("questionnaire-1", ["alex@example.com"])).resolves.toEqual({
      sent: ["alex@example.com"],
      failed: [],
    });
  });

  it("uses default errors for questionnaire and response requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      } as Response);

    await expect(fetchQuestionnaire("missing")).rejects.toThrow(
      "Questionnaire not found"
    );
    await expect(fetchResponses("questionnaire-1")).rejects.toThrow(
      "Failed to fetch responses"
    );
    await expect(
      submitQuestionnaireResponse("questionnaire-1", "alex@example.com", {
        "0": 1,
      })
    ).rejects.toThrow("Failed to submit response");
    await expect(
      shareQuestionnaire("questionnaire-1", ["alex@example.com"])
    ).rejects.toThrow("Failed to share questionnaire");
  });
});
