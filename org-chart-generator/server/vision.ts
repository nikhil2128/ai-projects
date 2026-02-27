import OpenAI from "openai";

let openai: OpenAI;
function getClient() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

const SYSTEM_PROMPT = `You are an expert at reading handwritten organizational charts and converting them into structured JSON data.

Analyze the provided image of a handwritten org chart and extract the hierarchical structure.

Rules:
1. Identify each person/role box in the chart.
2. Determine the hierarchical relationships (who reports to whom) based on connecting lines.
3. Extract the name and title/role for each person. If only a title is visible, use it as both name and title.
4. If a name or title is unclear, make your best guess from context.
5. Return ONLY valid JSON matching this exact schema — no markdown fences, no extra text.

Schema:
{
  "name": "string (person's name)",
  "title": "string (job title/role)",
  "children": [
    {
      "name": "string",
      "title": "string",
      "children": [...]
    }
  ]
}

The root node should be the highest-ranking person in the chart. Every node must have "name" and "title". "children" is optional (omit or use empty array for leaf nodes).`;

export async function parseOrgChart(
  base64Image: string,
  mimeType: string,
): Promise<unknown> {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    temperature: 0.1,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Parse this handwritten org chart into the JSON structure described. Return ONLY the JSON, nothing else.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No response from AI model");
  }

  const cleaned = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`AI returned invalid JSON: ${content.slice(0, 200)}`);
  }
}
