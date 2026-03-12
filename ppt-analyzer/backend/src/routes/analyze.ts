import { Router, type RequestHandler } from "express";
import multer from "multer";
import { parsePptx } from "../services/pptxParser.js";
import { analyzePresentation } from "../services/aiAnalyzer.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
    ];
    const allowedExtensions = [".pptx", ".ppt"];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PowerPoint files (.pptx) are accepted"));
    }
  },
});

const router = Router();

router.post("/", upload.single("file") as unknown as RequestHandler, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server" });
      return;
    }

    const slides = await parsePptx(req.file.buffer);

    if (slides.length === 0) {
      res.status(400).json({ error: "The presentation contains no slides" });
      return;
    }

    const result = await analyzePresentation(slides, req.file.originalname);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("Analysis error:", err);
    res.status(500).json({ error: message });
  }
});

export default router;
