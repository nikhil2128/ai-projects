import OpenAI from "openai";

let openai: OpenAI;
function getClient() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
  }
  return openai;
}

export async function analyzeImage(
  base64Image: string,
  mimeType: string
): Promise<string[]> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert training content analyst. Your job is to analyze images and extract distinct training topics from them.

The image may contain:
- Whiteboard notes, diagrams, or mind maps
- Slides or presentation screenshots
- Handwritten notes or printed documents
- Process flows, organizational charts, or technical diagrams
- Photographs of training materials, textbooks, or manuals

Extract clear, specific, and actionable training topics. Each topic should be suitable for creating a standalone training module for employees.

Respond with JSON in this exact format:
{
  "topics": ["Topic 1", "Topic 2", "Topic 3"]
}

Rules:
- Extract between 1 and 10 topics
- Each topic should be concise but descriptive (3-8 words)
- Topics should be distinct and non-overlapping
- Focus on trainable skills, concepts, or procedures
- If the image is unclear, extract what you can and note any uncertainty in the topic name`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this image and extract all training topics you can identify. Return ONLY the JSON with topics.",
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

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI model");
  }

  const parsed = JSON.parse(content) as { topics: string[] };

  if (!Array.isArray(parsed.topics) || parsed.topics.length === 0) {
    throw new Error("No topics could be extracted from the image");
  }

  return parsed.topics;
}
