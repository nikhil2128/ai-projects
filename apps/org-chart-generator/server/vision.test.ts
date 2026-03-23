import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

beforeEach(() => {
  vi.resetModules();
  mockCreate.mockReset();
});

describe("parseOrgChart", () => {
  it("sends image to OpenAI and returns parsed JSON", async () => {
    const orgData = { name: "Alice", title: "CEO", children: [] };
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(orgData) } }],
    });

    const { parseOrgChart } = await import("./vision.js");
    const result = await parseOrgChart("base64data", "image/png");

    expect(result).toEqual(orgData);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        max_tokens: 4096,
        temperature: 0.1,
      }),
    );
  });

  it("strips markdown code fences from response", async () => {
    const orgData = { name: "Bob", title: "CTO" };
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "```json\n" + JSON.stringify(orgData) + "\n```",
          },
        },
      ],
    });

    const { parseOrgChart } = await import("./vision.js");
    const result = await parseOrgChart("base64data", "image/png");
    expect(result).toEqual(orgData);
  });

  it("throws when AI returns no content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const { parseOrgChart } = await import("./vision.js");
    await expect(
      parseOrgChart("base64data", "image/png"),
    ).rejects.toThrow("No response from AI model");
  });

  it("throws when AI returns invalid JSON", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "not valid json at all" } }],
    });

    const { parseOrgChart } = await import("./vision.js");
    await expect(
      parseOrgChart("base64data", "image/png"),
    ).rejects.toThrow("AI returned invalid JSON");
  });

  it("throws when AI returns empty choices", async () => {
    mockCreate.mockResolvedValue({
      choices: [],
    });

    const { parseOrgChart } = await import("./vision.js");
    await expect(
      parseOrgChart("base64data", "image/png"),
    ).rejects.toThrow("No response from AI model");
  });

  it("includes the base64 image in the request", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"name":"A","title":"B"}' } }],
    });

    const { parseOrgChart } = await import("./vision.js");
    await parseOrgChart("abc123", "image/jpeg");

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[1];
    const imageContent = userMessage.content.find(
      (c: { type: string }) => c.type === "image_url",
    );
    expect(imageContent.image_url.url).toBe(
      "data:image/jpeg;base64,abc123",
    );
  });

  it("includes system prompt in messages", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"name":"A","title":"B"}' } }],
    });

    const { parseOrgChart } = await import("./vision.js");
    await parseOrgChart("data", "image/png");

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].role).toBe("system");
    expect(callArgs.messages[0].content).toContain(
      "expert at reading handwritten organizational charts",
    );
  });
});
