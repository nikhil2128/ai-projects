const pptState = vi.hoisted(() => ({
  lastInstance: null as {
    layout: string;
    author: string;
    title: string;
    slides: Array<{
      background?: { color: string };
      calls: Array<
        | { type: "text"; value: unknown; options: Record<string, unknown> }
        | { type: "shape"; value: unknown; options: Record<string, unknown> }
        | { type: "image"; options: Record<string, unknown> }
      >;
    }>;
    writeFile: ReturnType<typeof vi.fn>;
  } | null,
  MockPptx: class {
    layout = "";
    author = "";
    title = "";
    slides: Array<{
      background?: { color: string };
      calls: Array<
        | { type: "text"; value: unknown; options: Record<string, unknown> }
        | { type: "shape"; value: unknown; options: Record<string, unknown> }
        | { type: "image"; options: Record<string, unknown> }
      >;
    }> = [];
    writeFile = vi.fn().mockResolvedValue(undefined);

    addSlide() {
      const slide = {
        background: undefined as { color: string } | undefined,
        calls: [] as Array<
          | { type: "text"; value: unknown; options: Record<string, unknown> }
          | { type: "shape"; value: unknown; options: Record<string, unknown> }
          | { type: "image"; options: Record<string, unknown> }
        >,
        addText(value: unknown, options: Record<string, unknown>) {
          this.calls.push({ type: "text", value, options });
        },
        addShape(value: unknown, options: Record<string, unknown>) {
          this.calls.push({ type: "shape", value, options });
        },
        addImage(options: Record<string, unknown>) {
          this.calls.push({ type: "image", options });
        },
      };

      this.slides.push(slide);
      return slide;
    }
  },
}));

vi.mock("pptxgenjs", () => ({
  default: class PptxGenJS extends pptState.MockPptx {
    constructor() {
      super();
      pptState.lastInstance = this;
    }
  },
}));

import { exportToPPT } from "../../../src/utils/pptExport";

describe("pptExport", () => {
  beforeEach(() => {
    pptState.lastInstance = null;

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      ((tagName: string, options?: ElementCreationOptions) => {
        if (tagName !== "canvas") {
          return originalCreateElement(tagName, options);
        }

        const gradient = { addColorStop: vi.fn() };
        const context = {
          beginPath: vi.fn(),
          arc: vi.fn(),
          bezierCurveTo: vi.fn(),
          createLinearGradient: vi.fn(() => gradient),
          fill: vi.fn(),
          fillRect: vi.fn(),
          moveTo: vi.fn(),
          stroke: vi.fn(),
          fillStyle: "",
          lineWidth: 0,
          strokeStyle: "",
        };

        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => context),
          toDataURL: vi.fn(() => "data:image/png;base64,generated-art"),
        } as unknown as HTMLCanvasElement;
      }) as typeof document.createElement
    );
  });

  it("builds a presentation with generated art, provided images, and quiz slides", async () => {
    const longBody = Array.from({ length: 8 }, () =>
      [
        "## Heading",
        "",
        "- First point",
        "- Second point",
        "",
        "This paragraph explains a long scenario in enough detail to force the section to split across slides when exporting.",
      ].join("\n")
    ).join("\n\n");

    await exportToPPT(
      [
        {
          topic: "Safety Basics",
          overview: "Intro module",
          learningObjectives: ["Identify hazards", "Reduce risk", "Escalate incidents"],
          content: [
            {
              title: "Foundations",
              body: longBody,
            },
          ],
          keyTakeaways: ["A", "B", "C", "D", "E"],
          assessmentQuestions: [
            {
              question: "What comes first?",
              options: ["Ignore it", "Report it", "Delay it", "Archive it"],
              correctAnswer: 1,
              explanation: "Reporting comes first.",
            },
            {
              question: "What reduces risk?",
              options: ["Confusion", "Clear process", "Silence", "Guessing"],
              correctAnswer: 1,
              explanation: "Clear process reduces risk.",
            },
            {
              question: "What supports follow-up?",
              options: ["No notes", "Shared action items", "Deleted logs", "Delay"],
              correctAnswer: 1,
              explanation: "Action items support follow-up.",
            },
          ],
          estimatedDuration: "15 minutes",
        },
        {
          topic: "Incident Review",
          overview: "Follow-up module",
          learningObjectives: ["Review outcomes", "Capture learnings", "Improve process"],
          content: [
            {
              title: "Retrospective",
              body: "Use **clear** notes and capture owners.",
            },
          ],
          keyTakeaways: ["One", "Two", "Three", "Four", "Five"],
          assessmentQuestions: [],
          estimatedDuration: "10 minutes",
        },
      ],
      {
        "Incident Review": "data:image/png;base64,topic-image",
        Retrospective: "data:image/png;base64,section-image",
      }
    );

    const presentation = pptState.lastInstance;

    expect(presentation).not.toBeNull();
    expect(presentation?.layout).toBe("LAYOUT_WIDE");
    expect(presentation?.author).toBe("Training Content Generator");
    expect(presentation?.title).toBe("Training Materials");
    expect(presentation?.writeFile).toHaveBeenCalledWith({
      fileName: "Training-Materials.pptx",
    });
    expect(presentation?.slides.length).toBeGreaterThan(10);

    const allImageCalls = presentation?.slides.flatMap((slide) =>
      slide.calls.filter((call) => call.type === "image")
    );
    expect(allImageCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          options: expect.objectContaining({
            data: "data:image/png;base64,generated-art",
          }),
        }),
        expect.objectContaining({
          options: expect.objectContaining({
            data: "data:image/png;base64,topic-image",
          }),
        }),
        expect.objectContaining({
          options: expect.objectContaining({
            data: "data:image/png;base64,section-image",
          }),
        }),
      ])
    );
  });
});
