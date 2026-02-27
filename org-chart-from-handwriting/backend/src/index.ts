import "dotenv/config";

import cors from "cors";
import express from "express";
import multer from "multer";
import OpenAI from "openai";

import { ORG_CHART_PROMPT } from "./prompt.js";
import { OrgChartSchema, type OrgChart } from "./schema.js";

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const openAiBaseUrl = process.env.OPENAI_BASE_URL;

if (!openAiApiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment.");
}

const openai = new OpenAI({
  apiKey: openAiApiKey,
  baseURL: openAiBaseUrl
});

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/org-chart/from-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing image file. Use field name 'image'." });
    }

    const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
    if (!supportedMimeTypes.has(req.file.mimetype)) {
      return res.status(400).json({ error: "Unsupported file format. Use PNG/JPEG/WebP." });
    }

    const imageDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const response = await openai.responses.create({
      model: openAiModel,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: ORG_CHART_PROMPT },
            { type: "input_image", image_url: imageDataUrl, detail: "high" }
          ]
        }
      ]
    });

    const text = response.output_text;
    if (!text) {
      return res.status(502).json({ error: "Vision model returned an empty response." });
    }

    const chart = normalizeChart(parseModelJson(text));

    return res.json({
      chart,
      model: openAiModel
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return res.status(500).json({
      error: "Failed to extract org chart from image.",
      details: message
    });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Org chart backend listening on http://localhost:${port}`);
});

function parseModelJson(rawText: string): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function normalizeChart(input: unknown): OrgChart {
  const parsed = OrgChartSchema.parse(input);
  const normalizedNodes = parsed.nodes.map((node) => {
    const normalizedRole = node.role.trim() || "Role not specified";
    return {
      ...node,
      role: normalizedRole
    };
  });

  const nodeMap = new Map(normalizedNodes.map((node) => [node.id, node]));

  const dedupedEdges = new Map<string, { managerId: string; reportId: string }>();
  for (const edge of parsed.edges) {
    if (edge.managerId === edge.reportId) {
      continue;
    }
    if (!nodeMap.has(edge.managerId) || !nodeMap.has(edge.reportId)) {
      continue;
    }
    dedupedEdges.set(`${edge.managerId}->${edge.reportId}`, edge);
  }

  return {
    ...parsed,
    nodes: normalizedNodes,
    edges: [...dedupedEdges.values()]
  };
}
