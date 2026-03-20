import express from "express";
import cors from "cors";
import multer from "multer";
import { analyzeImage } from "./services/imageAnalyzer.js";
import { generateTrainingContent } from "./services/contentGenerator.js";
import { searchTopicImages } from "./services/imageSearch.js";
import {
  createQuestionnaire,
  getQuestionnaire,
  submitResponse,
  getResponses,
} from "./services/questionnaireStore.js";
import { sendQuestionnaireEmails } from "./services/emailService.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/extract-topics", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;
    const topics = await analyzeImage(base64Image, mimeType);

    res.json({ success: true, topics });
  } catch (error) {
    console.error("Topic extraction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to extract topics";
    res.status(500).json({ success: false, error: message });
  }
});

app.post("/api/generate-content", async (req, res) => {
  try {
    const { topics } = req.body as { topics: string[] };

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      res.status(400).json({ error: "Please provide an array of topics" });
      return;
    }

    if (topics.length > 10) {
      res
        .status(400)
        .json({ error: "Maximum 10 topics allowed per request" });
      return;
    }

    const content = await generateTrainingContent(topics);
    res.json({ success: true, content });
  } catch (error) {
    console.error("Content generation error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate training content";
    res.status(500).json({ success: false, error: message });
  }
});

app.post("/api/topic-images", async (req, res) => {
  try {
    const { queries } = req.body as { queries: string[] };

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      res.status(400).json({ error: "Please provide an array of search queries" });
      return;
    }

    if (queries.length > 30) {
      res.status(400).json({ error: "Maximum 30 image queries per request" });
      return;
    }

    const images = await searchTopicImages(queries);
    res.json({ success: true, images });
  } catch (error) {
    console.error("Image search error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch topic images";
    res.status(500).json({ success: false, error: message });
  }
});

// --- Questionnaire endpoints ---

app.post("/api/questionnaires", (req, res) => {
  try {
    const { title, modules } = req.body as {
      title: string;
      modules: { topic: string; questions: { question: string; options: string[]; correctAnswer: number; explanation: string }[] }[];
    };

    if (!title || !modules || modules.length === 0) {
      res.status(400).json({ error: "Title and modules are required" });
      return;
    }

    const questionnaire = createQuestionnaire(title, modules);
    res.json({ success: true, questionnaire });
  } catch (error) {
    console.error("Create questionnaire error:", error);
    const message = error instanceof Error ? error.message : "Failed to create questionnaire";
    res.status(500).json({ success: false, error: message });
  }
});

app.get("/api/questionnaires/:id", (req, res) => {
  try {
    const questionnaire = getQuestionnaire(req.params.id!);
    if (!questionnaire) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }
    res.json({ success: true, questionnaire });
  } catch (error) {
    console.error("Get questionnaire error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch questionnaire" });
  }
});

app.post("/api/questionnaires/:id/responses", (req, res) => {
  try {
    const { employeeEmail, answers } = req.body as {
      employeeEmail: string;
      answers: Record<string, number>;
    };

    if (!employeeEmail || !answers) {
      res.status(400).json({ error: "Employee email and answers are required" });
      return;
    }

    const response = submitResponse(req.params.id!, employeeEmail, answers);
    res.json({ success: true, response });
  } catch (error) {
    console.error("Submit response error:", error);
    const message = error instanceof Error ? error.message : "Failed to submit response";
    res.status(500).json({ success: false, error: message });
  }
});

app.get("/api/questionnaires/:id/responses", (req, res) => {
  try {
    const responses = getResponses(req.params.id!);
    res.json({ success: true, responses });
  } catch (error) {
    console.error("Get responses error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch responses" });
  }
});

app.post("/api/questionnaires/:id/share", async (req, res) => {
  try {
    const { emails } = req.body as { emails: string[] };

    if (!emails || emails.length === 0) {
      res.status(400).json({ error: "At least one email is required" });
      return;
    }

    const questionnaire = getQuestionnaire(req.params.id!);
    if (!questionnaire) {
      res.status(404).json({ error: "Questionnaire not found" });
      return;
    }

    const appUrl = process.env["APP_URL"] ?? "http://localhost:5173";
    const questionnaireUrl = `${appUrl}/questionnaire/${questionnaire.id}`;

    const result = await sendQuestionnaireEmails(
      emails,
      questionnaire.title,
      questionnaireUrl
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Share questionnaire error:", error);
    const message = error instanceof Error ? error.message : "Failed to share questionnaire";
    res.status(500).json({ success: false, error: message });
  }
});

export default app;
