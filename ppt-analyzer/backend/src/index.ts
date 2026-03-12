import "dotenv/config";
import express from "express";
import cors from "cors";
import analyzeRouter from "./routes/analyze.js";
import generatePptRouter from "./routes/generatePpt.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/analyze", analyzeRouter);
app.use("/api/generate-ppt", generatePptRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`PPT Analyzer backend running on http://localhost:${PORT}`);
});
