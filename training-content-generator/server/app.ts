import express from "express";
import cors from "cors";
import multer from "multer";
import { analyzeImage } from "./services/imageAnalyzer.js";
import { generateTrainingContent } from "./services/contentGenerator.js";

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

export default app;
