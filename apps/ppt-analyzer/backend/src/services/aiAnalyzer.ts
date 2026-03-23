import OpenAI from "openai";
import type { SlideContent, SlideAnalysis, AnalysisResult } from "../types/index.js";

let _openai: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const SLIDE_ANALYSIS_PROMPT = `You are an expert presentation analyst. Analyze the following PowerPoint slide content and provide structured insights.

Slide {slideNumber} of {totalSlides}:
Title: {title}
Content:
{content}
{tableSection}
{notesSection}

Respond with a JSON object (and nothing else) using this exact structure:
{
  "summary": "A concise 1-2 sentence summary of the slide",
  "keyPoints": ["Key point 1", "Key point 2"],
  "charts": [
    {
      "type": "bar|line|pie|area|radar",
      "title": "Chart title",
      "description": "Why this chart is relevant to the slide content",
      "data": {
        "labels": ["Label1", "Label2", "Label3"],
        "datasets": [
          {
            "label": "Dataset name",
            "data": [10, 20, 30]
          }
        ]
      }
    }
  ],
  "actionPlan": {
    "summary": "Brief summary of recommended actions",
    "actions": [
      {
        "id": "1",
        "task": "Specific actionable task",
        "priority": "high|medium|low",
        "category": "Category name",
        "suggestedTimeline": "e.g. Within 1 week",
        "details": "Additional context"
      }
    ]
  }
}

Guidelines:
- Generate charts ONLY when the slide content contains quantitative data, comparisons, trends, metrics, or concepts that benefit from visualization. Create realistic data based on the content.
- For action plans, identify concrete actionable items from the slide. If the slide is purely informational with no implied actions, set actionPlan to null.
- Keep chart data realistic and derived from the slide content.
- Generate 0-3 charts per slide depending on content richness.
- Generate 0-5 action items per slide depending on content.`;

async function analyzeSlide(
  slide: SlideContent,
  totalSlides: number,
): Promise<SlideAnalysis> {
  const content = slide.textContent.join("\n");
  const tableSection = slide.tableData
    ? `Table Data:\n${slide.tableData.map((row) => row.join(" | ")).join("\n")}`
    : "";
  const notesSection = slide.notes ? `Speaker Notes: ${slide.notes}` : "";

  const prompt = SLIDE_ANALYSIS_PROMPT
    .replace("{slideNumber}", String(slide.slideNumber))
    .replace("{totalSlides}", String(totalSlides))
    .replace("{title}", slide.title)
    .replace("{content}", content || "(No text content)")
    .replace("{tableSection}", tableSection)
    .replace("{notesSection}", notesSection);

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    return fallbackAnalysis(slide);
  }

  try {
    const parsed = JSON.parse(raw) as {
      summary?: string;
      keyPoints?: string[];
      charts?: SlideAnalysis["charts"];
      actionPlan?: SlideAnalysis["actionPlan"];
    };

    return {
      slideNumber: slide.slideNumber,
      title: slide.title,
      summary: parsed.summary ?? "No summary available",
      keyPoints: parsed.keyPoints ?? [],
      charts: parsed.charts ?? [],
      actionPlan: parsed.actionPlan ?? null,
    };
  } catch {
    return fallbackAnalysis(slide);
  }
}

function fallbackAnalysis(slide: SlideContent): SlideAnalysis {
  return {
    slideNumber: slide.slideNumber,
    title: slide.title,
    summary: slide.textContent.slice(0, 2).join(". ") || "Empty slide",
    keyPoints: slide.textContent.slice(0, 5),
    charts: [],
    actionPlan: null,
  };
}

const OVERALL_SUMMARY_PROMPT = `Based on the following slide summaries from a PowerPoint presentation, provide a concise 2-3 sentence overall summary of the entire presentation.

{slideSummaries}

Respond with a JSON object: { "overallSummary": "Your summary here" }`;

export async function analyzePresentation(
  slides: SlideContent[],
  fileName: string,
): Promise<AnalysisResult> {
  const CONCURRENCY_LIMIT = 3;
  const analysisResults: SlideAnalysis[] = [];

  for (let i = 0; i < slides.length; i += CONCURRENCY_LIMIT) {
    const batch = slides.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map((slide) => analyzeSlide(slide, slides.length)),
    );
    analysisResults.push(...batchResults);
  }

  let overallSummary = "Presentation analysis complete.";
  try {
    const slideSummaries = analysisResults
      .map((s) => `Slide ${s.slideNumber} (${s.title}): ${s.summary}`)
      .join("\n");

    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: OVERALL_SUMMARY_PROMPT.replace("{slideSummaries}", slideSummaries),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content;
    if (raw) {
      const parsed = JSON.parse(raw) as { overallSummary?: string };
      overallSummary = parsed.overallSummary ?? overallSummary;
    }
  } catch {
    // keep default summary
  }

  return {
    fileName,
    totalSlides: slides.length,
    overallSummary,
    slides: analysisResults,
  };
}
