import { z } from "zod";

const NonEmptyTrimmedString = z.string().trim().min(1);
const OptionalLooseString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value.trim() : ""));

export const OrgNodeSchema = z.object({
  id: NonEmptyTrimmedString,
  name: NonEmptyTrimmedString,
  // Role can be missing/blank in handwritten charts; normalize fallback in service layer.
  role: OptionalLooseString,
  team: OptionalLooseString.transform((value) => (value ? value : undefined))
});

export const OrgEdgeSchema = z.object({
  managerId: NonEmptyTrimmedString,
  reportId: NonEmptyTrimmedString
});

export const OrgChartSchema = z.object({
  organizationName: OptionalLooseString.transform((value) => value || "Organization"),
  nodes: z.array(OrgNodeSchema).min(1),
  edges: z.array(OrgEdgeSchema).optional().default([]),
  confidence: z.enum(["high", "medium", "low"]).optional().default("medium"),
  assumptions: z.array(z.string().trim()).optional().default([])
});

export type OrgChart = z.infer<typeof OrgChartSchema>;
