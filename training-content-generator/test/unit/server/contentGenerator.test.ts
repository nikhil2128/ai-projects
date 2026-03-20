const { createCompletionMock } = vi.hoisted(() => ({
  createCompletionMock: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: createCompletionMock,
      },
    };
  },
}));

import { generateTrainingContent } from "../../../server/services/contentGenerator";

function buildModule(topic: string, overrides?: Partial<{ estimatedDuration: string; topic: string }>) {
  return {
    topic: overrides?.topic ?? topic,
    overview: `${topic} overview`,
    learningObjectives: ["Understand the topic", "Apply the topic", "Review the topic"],
    content: [
      {
        title: `${topic} basics`,
        body: `Detailed guidance for ${topic}.`,
      },
    ],
    keyTakeaways: ["One", "Two", "Three", "Four", "Five"],
    assessmentQuestions: [
      {
        question: `${topic} question`,
        options: ["A", "B", "C", "D"],
        correctAnswer: 1,
        explanation: "Because B",
      },
      {
        question: `${topic} follow-up`,
        options: ["A", "B", "C", "D"],
        correctAnswer: 2,
        explanation: "Because C",
      },
      {
        question: `${topic} recap`,
        options: ["A", "B", "C", "D"],
        correctAnswer: 0,
        explanation: "Because A",
      },
    ],
    ...(overrides?.estimatedDuration
      ? { estimatedDuration: overrides.estimatedDuration }
      : {}),
  };
}

describe("contentGenerator", () => {
  beforeEach(() => {
    createCompletionMock.mockReset();
  });

  it("generates modules in batches and applies fallbacks", async () => {
    createCompletionMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(buildModule("Alpha", { topic: "", estimatedDuration: undefined })),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(buildModule("Beta")) } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(buildModule("Gamma")) } }],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(buildModule("Delta", { estimatedDuration: "30 minutes" })),
            },
          },
        ],
      });

    const result = await generateTrainingContent(["Alpha", "Beta", "Gamma", "Delta"]);

    expect(result).toHaveLength(4);
    expect(result[0]).toMatchObject({
      topic: "Alpha",
      estimatedDuration: "15-20 minutes",
    });
    expect(result[3]).toMatchObject({
      topic: "Delta",
      estimatedDuration: "30 minutes",
    });
    expect(createCompletionMock).toHaveBeenCalledTimes(4);
    expect(createCompletionMock.mock.calls[0]?.[0]).toMatchObject({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    });
  });

  it("throws when the AI response has no content", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    await expect(generateTrainingContent(["Alpha"])).rejects.toThrow(
      "Failed to generate content for topic: Alpha"
    );
  });
});
