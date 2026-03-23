import { Router } from "express";
import { generateReport } from "../services/pptxGenerator.js";
import type { AnalysisResult } from "../types/index.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const result = req.body as AnalysisResult;

    if (!result?.slides?.length) {
      res.status(400).json({ error: "No analysis data provided" });
      return;
    }

    const chartSummary = result.slides.map((s) => ({
      slide: s.slideNumber,
      charts: Array.isArray(s.charts) ? s.charts.length : 0,
      chartTypes: Array.isArray(s.charts) ? s.charts.map((c) => c?.type) : [],
    }));
    console.log("[generate-ppt] Generating report with chart data:", JSON.stringify(chartSummary));

    const buffer = await generateReport(result);

    const safeName = result.fileName
      .replace(/\.(pptx?|PPTX?)$/, "")
      .replace(/[^a-zA-Z0-9_\- ]/g, "_");

    console.log("[generate-ppt] Report generated successfully, size:", buffer.length, "bytes");

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_Report.pptx"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Report generation failed";
    console.error("[generate-ppt] Report generation error:", err);
    res.status(500).json({ error: message });
  }
});

export default router;
