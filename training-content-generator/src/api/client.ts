import type { TrainingModule, Questionnaire, QuestionnaireResponse } from "../types";

export async function fetchTopicImages(
  queries: string[]
): Promise<Record<string, string>> {
  const response = await fetch("/api/topic-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries }),
  });

  if (!response.ok) {
    console.warn("Topic image fetch failed, will use fallback art");
    return {};
  }

  const data = (await response.json()) as {
    success: boolean;
    images: Record<string, string>;
  };
  return data.images;
}

export async function extractTopicsFromImage(
  file: File
): Promise<string[]> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/extract-topics", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to extract topics");
  }

  const data = (await response.json()) as { success: boolean; topics: string[] };
  return data.topics;
}

export async function generateContent(
  topics: string[]
): Promise<TrainingModule[]> {
  const response = await fetch("/api/generate-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topics }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to generate content");
  }

  const data = (await response.json()) as {
    success: boolean;
    content: TrainingModule[];
  };
  return data.content;
}

export async function createQuestionnaire(
  title: string,
  modules: TrainingModule[]
): Promise<Questionnaire> {
  const payload = {
    title,
    modules: modules.map((m) => ({
      topic: m.topic,
      questions: m.assessmentQuestions,
    })),
  };

  const response = await fetch("/api/questionnaires", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to create questionnaire");
  }

  const data = (await response.json()) as { success: boolean; questionnaire: Questionnaire };
  return data.questionnaire;
}

export async function fetchQuestionnaire(id: string): Promise<Questionnaire> {
  const response = await fetch(`/api/questionnaires/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Questionnaire not found");
  }
  const data = (await response.json()) as { success: boolean; questionnaire: Questionnaire };
  return data.questionnaire;
}

export async function submitQuestionnaireResponse(
  questionnaireId: string,
  employeeEmail: string,
  answers: Record<string, number>
): Promise<QuestionnaireResponse> {
  const response = await fetch(`/api/questionnaires/${questionnaireId}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeEmail, answers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to submit response");
  }

  const data = (await response.json()) as { success: boolean; response: QuestionnaireResponse };
  return data.response;
}

export async function fetchResponses(questionnaireId: string): Promise<QuestionnaireResponse[]> {
  const response = await fetch(`/api/questionnaires/${questionnaireId}/responses`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to fetch responses");
  }
  const data = (await response.json()) as { success: boolean; responses: QuestionnaireResponse[] };
  return data.responses;
}

export async function shareQuestionnaire(
  questionnaireId: string,
  emails: string[]
): Promise<{ sent: string[]; failed: string[] }> {
  const response = await fetch(`/api/questionnaires/${questionnaireId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error ?? "Failed to share questionnaire");
  }

  const data = (await response.json()) as { success: boolean; sent: string[]; failed: string[] };
  return { sent: data.sent, failed: data.failed };
}
