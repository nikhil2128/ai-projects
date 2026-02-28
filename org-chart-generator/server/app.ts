import express from "express";
import cors from "cors";
import multer from "multer";
import { parseOrgChart } from "./vision.js";

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

app.post("/api/parse", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No image uploaded" });
      return;
    }

    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;
    const result = await parseOrgChart(base64Image, mimeType);

    res.json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse org chart";
    res.status(500).json({ success: false, error: message });
  }
});

export default app;
