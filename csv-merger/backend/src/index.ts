import cors from "cors";
import compression from "compression";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { streamAnalyzeFile, findCommonKey } from "./analyzer";
import { streamMergeCSVFiles } from "./merger";
import { SessionData } from "./types";

// ─── Configuration ──────────────────────────────────────────────
const PORT = process.env.PORT ?? 3001;
const MAX_ROWS_PER_FILE = 100_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file
const MAX_FILES = 10;
const SESSION_TTL = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL = 60 * 1000; // check every minute

// ─── Express setup ──────────────────────────────────────────────
const app = express();

app.use(compression()); // gzip all responses
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ─── Session storage (file paths + metadata, NOT row data) ─────
const sessions = new Map<string, SessionData>();

// ─── Upload directory ───────────────────────────────────────────
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Multer config ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.originalname.endsWith(".csv") ||
      file.mimetype === "application/vnd.ms-excel"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

// ─── Routes ─────────────────────────────────────────────────────

/**
 * POST /api/upload
 *
 * Uploads CSV files, saves to disk, stream-analyses each one
 * (enforcing the 100K row limit), and returns column metadata.
 * Files are kept on disk for subsequent merge; NO row data is
 * held in memory.
 */
app.post("/api/upload", upload.array("files", MAX_FILES), async (req, res) => {
  const uploadedPaths: string[] = [];

  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    if (files.length < 2) {
      res
        .status(400)
        .json({ error: "Please upload at least 2 CSV files to merge" });
      return;
    }

    const sessionId = uuidv4();
    const filePaths: string[] = [];
    const fileNames: string[] = [];
    const fileAnalyses = [];

    for (const file of files) {
      uploadedPaths.push(file.path);

      // Stream-analyse (row-by-row) — rejects if row count > MAX_ROWS_PER_FILE
      const analysis = await streamAnalyzeFile(
        file.path,
        file.originalname,
        MAX_ROWS_PER_FILE
      );

      filePaths.push(file.path);
      fileNames.push(file.originalname);
      fileAnalyses.push(analysis);
    }

    const commonKey = findCommonKey(fileAnalyses);

    // Store lightweight session (paths + metadata only)
    sessions.set(sessionId, {
      filePaths,
      fileNames,
      fileAnalyses,
      commonKey,
      mergedCsvPath: null,
      cachedMergeResult: null,
      uploadedAt: new Date(),
    });

    res.json({
      sessionId,
      files: fileAnalyses,
      commonKey,
      totalFiles: files.length,
    });
  } catch (error) {
    // Clean up uploaded files on failure
    for (const p of uploadedPaths) {
      try {
        fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }

    const message = error instanceof Error ? error.message : "Upload failed";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/merge
 *
 * Merges previously uploaded CSV files using streaming I/O.
 * Writes the merged CSV to a temp file on disk and returns
 * only metadata + a small preview (100 rows) to the frontend.
 */
app.post("/api/merge", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: "Session ID is required" });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res
        .status(404)
        .json({ error: "Session not found. Please re-upload your files." });
      return;
    }

    // Return cached result if available
    if (
      session.cachedMergeResult &&
      session.mergedCsvPath &&
      fs.existsSync(session.mergedCsvPath)
    ) {
      res.json({ result: session.cachedMergeResult });
      return;
    }

    // Verify source files still exist on disk
    for (const fp of session.filePaths) {
      if (!fs.existsSync(fp)) {
        res.status(410).json({
          error: "Uploaded files have expired. Please re-upload.",
        });
        return;
      }
    }

    const outputPath = path.join(uploadDir, `merged-${sessionId}.csv`);

    const result = await streamMergeCSVFiles(
      session.filePaths,
      session.fileAnalyses,
      outputPath
    );

    // Cache for subsequent requests / download
    session.mergedCsvPath = outputPath;
    session.cachedMergeResult = result;

    res.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Merge failed";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/download/:sessionId
 *
 * Streams the previously-merged CSV file from disk.
 * No re-computation, no in-memory buffering.
 */
app.get("/api/download/:sessionId", (req, res) => {
  try {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
      res
        .status(404)
        .json({ error: "Session not found. Please re-upload your files." });
      return;
    }

    if (!session.mergedCsvPath || !fs.existsSync(session.mergedCsvPath)) {
      res.status(404).json({
        error: "No merged file found. Please merge your files first.",
      });
      return;
    }

    res.download(session.mergedCsvPath, "merged_output.csv");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed";
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/session/:sessionId
 *
 * Cleans up all files (uploads + merged CSV) and removes the session.
 */
app.delete("/api/session/:sessionId", (req, res) => {
  cleanupSession(req.params.sessionId);
  res.json({ success: true });
});

// ─── Session cleanup ────────────────────────────────────────────

function cleanupSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;

  // Delete uploaded source files
  for (const filePath of session.filePaths) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }

  // Delete merged CSV
  if (session.mergedCsvPath) {
    try {
      fs.unlinkSync(session.mergedCsvPath);
    } catch {
      /* ignore */
    }
  }

  sessions.delete(sessionId);
}

// Periodically clean up expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.uploadedAt.getTime() > SESSION_TTL) {
      cleanupSession(id);
    }
  }
}, CLEANUP_INTERVAL);

// ─── Start ──────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`CSV Merger backend running on http://localhost:${PORT}`);
});
