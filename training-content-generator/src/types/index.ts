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
