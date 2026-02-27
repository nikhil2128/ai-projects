export interface OrgNode {
  name: string;
  title: string;
  children?: OrgNode[];
}

export interface ParseResponse {
  success: boolean;
  data?: OrgNode;
  error?: string;
}

export type AppState = "idle" | "uploading" | "parsing" | "ready" | "error";
