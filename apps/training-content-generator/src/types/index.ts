export interface TrainingModule {
  topic: string;
  overview: string;
  learningObjectives: string[];
  content: ContentSection[];
  keyTakeaways: string[];
  assessmentQuestions: AssessmentQuestion[];
  estimatedDuration: string;
}

export interface ContentSection {
  title: string;
  body: string;
}

export interface AssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export type AppView = "home" | "topics" | "content";

export interface TopicItem {
  id: string;
  text: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  createdAt: string;
  modules: {
    topic: string;
    questions: AssessmentQuestion[];
  }[];
}

export interface QuestionnaireResponse {
  id: string;
  questionnaireId: string;
  employeeEmail: string;
  submittedAt: string;
  answers: Record<string, number>;
  score: number;
  totalQuestions: number;
}

export interface ShareRequest {
  emails: string[];
  questionnaireId: string;
}

export interface TrainingSession {
  id: string;
  title: string;
  topics: string[];
  modules: TrainingModule[];
  source: "image" | "manual";
  createdAt: string;
}

export interface TrainingSessionSummary {
  id: string;
  title: string;
  topics: string[];
  topicCount: number;
  source: "image" | "manual";
  createdAt: string;
}
