export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartData {
  type: "bar" | "line" | "pie" | "area" | "radar";
  title: string;
  description: string;
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
}

export interface ActionItem {
  id: string;
  task: string;
  priority: "high" | "medium" | "low";
  category: string;
  suggestedTimeline?: string;
  details?: string;
}

export interface ActionPlan {
  summary: string;
  actions: ActionItem[];
}

export interface SlideAnalysis {
  slideNumber: number;
  title: string;
  summary: string;
  keyPoints: string[];
  charts: ChartData[];
  actionPlan: ActionPlan | null;
}

export interface AnalysisResult {
  fileName: string;
  totalSlides: number;
  overallSummary: string;
  slides: SlideAnalysis[];
}

export type AppState = "idle" | "uploading" | "analyzing" | "done" | "error";
