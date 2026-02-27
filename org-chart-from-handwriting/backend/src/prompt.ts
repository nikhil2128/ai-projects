export const ORG_CHART_PROMPT = `
You are extracting an organization chart from a handwritten screenshot.

Read all text and connecting lines/arrows. Return ONLY valid JSON with this shape:
{
  "organizationName": "string",
  "nodes": [
    { "id": "string", "name": "string", "role": "string", "team": "string (optional)" }
  ],
  "edges": [
    { "managerId": "string", "reportId": "string" }
  ],
  "confidence": "high|medium|low",
  "assumptions": ["string"]
}

Rules:
- Use short stable ids (e.g. "ceo", "eng_mgr_1").
- Every node in edges must exist in nodes.
- edges represent manager -> direct report.
- role must never be empty; if not visible use "Role not specified".
- If a person name is unclear, keep best guess and add a note in assumptions.
- If only title is visible, use title as name too.
- Do not include markdown, code fences, or explanations.
`;
