import cors from "cors";
import express from "express";
import multer from "multer";
import { mergeCsvFiles } from "./services/mergeService.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/merge-csv", upload.array("files"), (req, res) => {
  const incomingFiles = (req.files ?? []) as Express.Multer.File[];
  if (!incomingFiles.length) {
    return res.status(400).json({ error: "No files were uploaded." });
  }

  try {
    const files = incomingFiles.map((file) => ({
      filename: file.originalname,
      content: file.buffer.toString("utf8"),
    }));
    const result = mergeCsvFiles(files);

    return res.json({
      headers: result.headers,
      rows: result.rows,
      csvText: result.csvText,
      fileCount: files.length,
      message: `Merged ${files.length} CSV files successfully.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return res.status(400).json({ error: message });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`CSV Relator backend running on http://localhost:${port}`);
});
