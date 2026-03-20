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

import { analyzeImage } from "../../../server/services/imageAnalyzer";

describe("imageAnalyzer", () => {
  beforeEach(() => {
    createCompletionMock.mockReset();
  });

  it("returns extracted topics from the AI response", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              topics: ["Risk Management", "Escalation Paths"],
            }),
          },
        },
      ],
    });

    await expect(analyzeImage("abc123", "image/png")).resolves.toEqual([
      "Risk Management",
      "Escalation Paths",
    ]);
    expect(createCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        response_format: { type: "json_object" },
      })
    );
  });

  it("throws when the AI response is empty", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    await expect(analyzeImage("abc123", "image/png")).rejects.toThrow(
      "No response from AI model"
    );
  });

  it("throws when no topics can be extracted", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ topics: [] }),
          },
        },
      ],
    });

    await expect(analyzeImage("abc123", "image/png")).rejects.toThrow(
      "No topics could be extracted from the image"
    );
  });
});
