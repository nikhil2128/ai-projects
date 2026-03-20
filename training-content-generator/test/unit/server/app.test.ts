import request from "supertest";

const mocks = vi.hoisted(() => ({
  analyzeImageMock: vi.fn(),
  createQuestionnaireMock: vi.fn(),
  generateTrainingContentMock: vi.fn(),
  getQuestionnaireMock: vi.fn(),
  getResponsesMock: vi.fn(),
  searchTopicImagesMock: vi.fn(),
  sendQuestionnaireEmailsMock: vi.fn(),
  submitResponseMock: vi.fn(),
}));

vi.mock("../../../server/services/imageAnalyzer.js", () => ({
  analyzeImage: mocks.analyzeImageMock,
}));

vi.mock("../../../server/services/contentGenerator.js", () => ({
  generateTrainingContent: mocks.generateTrainingContentMock,
}));

vi.mock("../../../server/services/imageSearch.js", () => ({
  searchTopicImages: mocks.searchTopicImagesMock,
}));

vi.mock("../../../server/services/questionnaireStore.js", () => ({
  createQuestionnaire: mocks.createQuestionnaireMock,
  getQuestionnaire: mocks.getQuestionnaireMock,
  submitResponse: mocks.submitResponseMock,
  getResponses: mocks.getResponsesMock,
}));

vi.mock("../../../server/services/emailService.js", () => ({
  sendQuestionnaireEmails: mocks.sendQuestionnaireEmailsMock,
}));

import app from "../../../server/app";

describe("server app", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mockFn) => mockFn.mockReset());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns a health check response", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("extracts topics from an uploaded image", async () => {
    mocks.analyzeImageMock.mockResolvedValue(["Communication", "Safety"]);

    const response = await request(app)
      .post("/api/extract-topics")
      .attach("image", Buffer.from("fake-image"), {
        filename: "notes.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      topics: ["Communication", "Safety"],
    });
    expect(mocks.analyzeImageMock).toHaveBeenCalledWith(
      Buffer.from("fake-image").toString("base64"),
      "image/png"
    );
  });

  it("rejects extract-topics requests without a file", async () => {
    const response = await request(app).post("/api/extract-topics");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "No image file provided" });
  });

  it("returns service errors from extract-topics", async () => {
    mocks.analyzeImageMock.mockRejectedValue(new Error("Image parsing failed"));

    const response = await request(app)
      .post("/api/extract-topics")
      .attach("image", Buffer.from("fake-image"), {
        filename: "notes.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: "Image parsing failed",
    });
  });

  it("validates, generates, and reports content generation errors", async () => {
    const modules = [{ topic: "Safety" }];
    mocks.generateTrainingContentMock
      .mockResolvedValueOnce(modules)
      .mockRejectedValueOnce(new Error("Generation failed"));

    const invalid = await request(app)
      .post("/api/generate-content")
      .send({ topics: [] });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatch(/please provide an array of topics/i);

    const tooMany = await request(app)
      .post("/api/generate-content")
      .send({ topics: Array.from({ length: 11 }, (_, index) => `Topic ${index}`) });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error).toMatch(/maximum 10 topics/i);

    const success = await request(app)
      .post("/api/generate-content")
      .send({ topics: ["Safety"] });
    expect(success.status).toBe(200);
    expect(success.body).toEqual({ success: true, content: modules });

    const failure = await request(app)
      .post("/api/generate-content")
      .send({ topics: ["Security"] });
    expect(failure.status).toBe(500);
    expect(failure.body).toEqual({
      success: false,
      error: "Generation failed",
    });
  });

  it("validates, fetches, and reports topic image errors", async () => {
    mocks.searchTopicImagesMock
      .mockResolvedValueOnce({ safety: "data:image/png;base64,abc" })
      .mockRejectedValueOnce(new Error("Unsplash unavailable"));

    const invalid = await request(app)
      .post("/api/topic-images")
      .send({ queries: [] });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatch(/please provide an array of search queries/i);

    const tooMany = await request(app)
      .post("/api/topic-images")
      .send({ queries: Array.from({ length: 31 }, (_, index) => `q-${index}`) });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error).toMatch(/maximum 30 image queries/i);

    const success = await request(app)
      .post("/api/topic-images")
      .send({ queries: ["safety"] });
    expect(success.status).toBe(200);
    expect(success.body).toEqual({
      success: true,
      images: { safety: "data:image/png;base64,abc" },
    });

    const failure = await request(app)
      .post("/api/topic-images")
      .send({ queries: ["security"] });
    expect(failure.status).toBe(500);
    expect(failure.body).toEqual({
      success: false,
      error: "Unsplash unavailable",
    });
  });

  it("creates and fetches questionnaires", async () => {
    const questionnaire = {
      id: "questionnaire-1",
      title: "Assessment",
      createdAt: "2026-03-20T10:00:00.000Z",
      modules: [{ topic: "Safety", questions: [] }],
    };
    mocks.createQuestionnaireMock.mockReturnValue(questionnaire);
    mocks.getQuestionnaireMock
      .mockReturnValueOnce(questionnaire)
      .mockReturnValueOnce(null);

    const createResponse = await request(app)
      .post("/api/questionnaires")
      .send({ title: "Assessment", modules: questionnaire.modules });
    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toEqual({ success: true, questionnaire });

    const fetchResponse = await request(app).get("/api/questionnaires/questionnaire-1");
    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.body).toEqual({ success: true, questionnaire });

    const missing = await request(app).get("/api/questionnaires/missing");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "Questionnaire not found" });
  });

  it("validates questionnaire creation and fetch failures", async () => {
    mocks.createQuestionnaireMock.mockImplementation(() => {
      throw new Error("Store unavailable");
    });
    mocks.getQuestionnaireMock.mockImplementation(() => {
      throw new Error("Lookup unavailable");
    });

    const invalid = await request(app)
      .post("/api/questionnaires")
      .send({ title: "", modules: [] });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: "Title and modules are required" });

    const failure = await request(app)
      .post("/api/questionnaires")
      .send({ title: "Assessment", modules: [{ topic: "Safety", questions: [] }] });
    expect(failure.status).toBe(500);
    expect(failure.body).toEqual({
      success: false,
      error: "Store unavailable",
    });

    const lookupFailure = await request(app).get("/api/questionnaires/questionnaire-1");
    expect(lookupFailure.status).toBe(500);
    expect(lookupFailure.body).toEqual({
      success: false,
      error: "Failed to fetch questionnaire",
    });
  });

  it("submits and lists questionnaire responses", async () => {
    const responseRecord = {
      id: "response-1",
      questionnaireId: "questionnaire-1",
      employeeEmail: "alex@example.com",
      submittedAt: "2026-03-20T10:10:00.000Z",
      answers: { "0": 1 },
      score: 1,
      totalQuestions: 1,
    };
    mocks.submitResponseMock.mockReturnValue(responseRecord);
    mocks.getResponsesMock.mockReturnValue([responseRecord]);

    const submitResponse = await request(app)
      .post("/api/questionnaires/questionnaire-1/responses")
      .send({
        employeeEmail: "alex@example.com",
        answers: { "0": 1 },
      });
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body).toEqual({ success: true, response: responseRecord });

    const fetchResponse = await request(app).get(
      "/api/questionnaires/questionnaire-1/responses"
    );
    expect(fetchResponse.status).toBe(200);
    expect(fetchResponse.body).toEqual({
      success: true,
      responses: [responseRecord],
    });
  });

  it("validates response submission and handles response lookup failures", async () => {
    mocks.submitResponseMock.mockImplementation(() => {
      throw new Error("Submit failed");
    });
    mocks.getResponsesMock.mockImplementation(() => {
      throw new Error("Responses unavailable");
    });

    const invalid = await request(app)
      .post("/api/questionnaires/questionnaire-1/responses")
      .send({ employeeEmail: "", answers: null });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({
      error: "Employee email and answers are required",
    });

    const failure = await request(app)
      .post("/api/questionnaires/questionnaire-1/responses")
      .send({ employeeEmail: "alex@example.com", answers: { "0": 1 } });
    expect(failure.status).toBe(500);
    expect(failure.body).toEqual({
      success: false,
      error: "Submit failed",
    });

    const lookupFailure = await request(app).get(
      "/api/questionnaires/questionnaire-1/responses"
    );
    expect(lookupFailure.status).toBe(500);
    expect(lookupFailure.body).toEqual({
      success: false,
      error: "Failed to fetch responses",
    });
  });

  it("shares questionnaires and handles missing data", async () => {
    const questionnaire = {
      id: "questionnaire-1",
      title: "Assessment",
      createdAt: "2026-03-20T10:00:00.000Z",
      modules: [],
    };
    mocks.getQuestionnaireMock
      .mockReturnValueOnce(questionnaire)
      .mockReturnValueOnce(null);
    mocks.sendQuestionnaireEmailsMock
      .mockResolvedValueOnce({ sent: ["alex@example.com"], failed: [] })
      .mockRejectedValueOnce(new Error("SMTP offline"));

    const success = await request(app)
      .post("/api/questionnaires/questionnaire-1/share")
      .send({ emails: ["alex@example.com"] });
    expect(success.status).toBe(200);
    expect(success.body).toEqual({
      success: true,
      sent: ["alex@example.com"],
      failed: [],
    });
    expect(mocks.sendQuestionnaireEmailsMock).toHaveBeenCalledWith(
      ["alex@example.com"],
      "Assessment",
      "http://localhost:5173/questionnaire/questionnaire-1"
    );

    const missingQuestionnaire = await request(app)
      .post("/api/questionnaires/missing/share")
      .send({ emails: ["alex@example.com"] });
    expect(missingQuestionnaire.status).toBe(404);
    expect(missingQuestionnaire.body).toEqual({ error: "Questionnaire not found" });

    mocks.getQuestionnaireMock.mockReturnValueOnce(questionnaire);
    const failure = await request(app)
      .post("/api/questionnaires/questionnaire-1/share")
      .send({ emails: ["alex@example.com"] });
    expect(failure.status).toBe(500);
    expect(failure.body).toEqual({
      success: false,
      error: "SMTP offline",
    });
  });

  it("validates share requests", async () => {
    const response = await request(app)
      .post("/api/questionnaires/questionnaire-1/share")
      .send({ emails: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "At least one email is required" });
  });
});
