import OpenAI from "openai";

let openai: OpenAI;
function getClient() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
  }
  return openai;
}

export interface TrainingModule {
  topic: string;
  overview: string;
  learningObjectives: string[];
  content: ContentSection[];
  keyTakeaways: string[];
  assessmentQuestions: AssessmentQuestion[];
  estimatedDuration: string;
}

interface ContentSection {
  title: string;
  body: string;
}

interface AssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const BATCH_SIZE = 3;

export async function generateTrainingContent(
  topics: string[]
): Promise<TrainingModule[]> {
  const results: TrainingModule[] = [];

  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    const batch = topics.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((topic) => generateModuleForTopic(topic))
    );
    results.push(...batchResults);
  }

  return results;
}

async function generateModuleForTopic(topic: string): Promise<TrainingModule> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 4096,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an expert instructional designer creating corporate training materials. Generate comprehensive, engaging, and practical training content.

Your content should be:
- Professional and suitable for a workplace environment
- Practical with real-world examples and actionable advice
- Structured for easy comprehension and retention
- Engaging and interactive where possible

Respond with JSON in this exact format:
{
  "topic": "The training topic title",
  "overview": "A 2-3 sentence overview of what this module covers and why it's important",
  "learningObjectives": [
    "Objective 1 (start with an action verb: Understand, Apply, Demonstrate, etc.)",
    "Objective 2",
    "Objective 3"
  ],
  "content": [
    {
      "title": "Section Title",
      "body": "Detailed content in markdown format. Use **bold**, *italic*, bullet points, and numbered lists for formatting. Include practical examples, tips, and best practices. Each section should be 150-300 words."
    }
  ],
  "keyTakeaways": [
    "Key takeaway 1",
    "Key takeaway 2",
    "Key takeaway 3",
    "Key takeaway 4",
    "Key takeaway 5"
  ],
  "assessmentQuestions": [
    {
      "question": "A multiple-choice question to test understanding",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why the correct answer is correct"
    }
  ]
}

Generate 3-5 content sections, 3-5 learning objectives, exactly 5 key takeaways, 3 assessment questions, and estimate the training duration.`,
      },
      {
        role: "user",
        content: `Create a comprehensive training module for the following topic: "${topic}"

The training should be suitable for employees who may have varying levels of experience with this subject. Include practical examples and actionable guidance.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`Failed to generate content for topic: ${topic}`);
  }

  const parsed = JSON.parse(content) as TrainingModule & {
    estimatedDuration?: string;
  };

  return {
    topic: parsed.topic || topic,
    overview: parsed.overview,
    learningObjectives: parsed.learningObjectives,
    content: parsed.content,
    keyTakeaways: parsed.keyTakeaways,
    assessmentQuestions: parsed.assessmentQuestions,
    estimatedDuration: parsed.estimatedDuration ?? "15-20 minutes",
  };
}
