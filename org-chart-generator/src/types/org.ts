export interface OrgNode {
  name: string;
  title: string;
  children?: OrgNode[];
}

export interface EditableOrgNode {
  id: string;
  name: string;
  title: string;
  children: EditableOrgNode[];
}

export interface ParseResponse {
  success: boolean;
  data?: OrgNode;
  error?: string;
}

export type AppState = "idle" | "uploading" | "parsing" | "ready" | "error";
