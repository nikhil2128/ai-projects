export type Confidence = "high" | "medium" | "low";

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  team?: string;
}

export interface OrgEdge {
  managerId: string;
  reportId: string;
}

export interface OrgChart {
  organizationName: string;
  nodes: OrgNode[];
  edges: OrgEdge[];
  confidence: Confidence;
  assumptions: string[];
}

export interface GenerateChartResponse {
  chart: OrgChart;
  model: string;
}
