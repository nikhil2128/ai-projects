import _PptxGenJSImport from "pptxgenjs";
import type { AnalysisResult, ActionItem, ChartData } from "../types/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _PptxGenJS = ((_PptxGenJSImport as any).default ?? _PptxGenJSImport) as typeof _PptxGenJSImport;

const COLORS = {
  primary: "4f46e5",
  titleText: "1e293b",
  bodyText: "334155",
  mutedText: "64748b",
  white: "ffffff",
  border: "e2e8f0",
  chartBg: "f8fafc",
  gridLine: "e2e8f0",
  high: { bg: "fee2e2", text: "991b1b" },
  medium: { bg: "fef3c7", text: "92400e" },
  low: { bg: "d1fae5", text: "065f46" },
};

const CHART_PALETTE = [
  "818cf8", "a78bfa", "f472b6", "fb923c", "34d399",
  "38bdf8", "fbbf24", "f87171", "2dd4bf", "c084fc",
];

const MAX_LABEL_LENGTH = 40;
const MAX_DATA_POINTS = 20;
const MAX_SERIES = 6;

/* ------------------------------------------------------------------ */
/*  Data helpers                                                       */
/* ------------------------------------------------------------------ */

function safeString(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  return String(value)
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .slice(0, MAX_LABEL_LENGTH) || fallback;
}

function toChartNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function sanitizeChart(chart: unknown): ChartData | null {
  if (!chart || typeof chart !== "object") return null;
  const c = chart as Record<string, unknown>;

  const validTypes = ["bar", "line", "pie", "area", "radar"] as const;
  const type = validTypes.includes(c.type as typeof validTypes[number])
    ? (c.type as ChartData["type"])
    : "bar";
  const title = safeString(c.title, "Chart");
  const description = safeString(c.description, "");

  if (!c.data || typeof c.data !== "object") return null;
  const data = c.data as Record<string, unknown>;
  if (!Array.isArray(data.labels) || !Array.isArray(data.datasets)) return null;
  if (data.labels.length === 0 || data.datasets.length === 0) return null;

  const labels = data.labels
    .slice(0, MAX_DATA_POINTS)
    .map((l: unknown, i: number) => safeString(l, `Item ${i + 1}`));

  const datasets = data.datasets
    .slice(0, MAX_SERIES)
    .filter((ds: unknown) => ds && typeof ds === "object" && Array.isArray((ds as Record<string, unknown>).data))
    .map((ds: unknown, i: number) => {
      const d = ds as Record<string, unknown>;
      return {
        label: safeString(d.label, `Series ${i + 1}`),
        data: labels.map((_: string, idx: number) =>
          toChartNumber((d.data as unknown[])[idx]),
        ),
      };
    });

  if (datasets.length === 0) return null;
  if (!datasets.some(ds => ds.data.some(v => v !== 0))) return null;

  return { type, title, description, data: { labels, datasets } };
}

function niceMax(value: number): number {
  if (value <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / mag;
  if (norm <= 1) return mag;
  if (norm <= 1.5) return 1.5 * mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 3) return 3 * mag;
  if (norm <= 5) return 5 * mag;
  if (norm <= 7.5) return 7.5 * mag;
  return 10 * mag;
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 10_000) return `${(v / 1_000).toFixed(0)}K`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

function seriesColor(idx: number): string {
  return CHART_PALETTE[idx % CHART_PALETTE.length]!;
}

/* ------------------------------------------------------------------ */
/*  Shape-based chart drawing                                          */
/* ------------------------------------------------------------------ */

interface Rect { x: number; y: number; w: number; h: number }

function drawBarChart(
  pptx: _PptxGenJSImport,
  slide: _PptxGenJSImport.Slide,
  chart: ChartData,
  area: Rect,
): void {
  const { labels, datasets } = chart.data;
  const numCats = labels.length;
  const numSeries = datasets.length;

  const allValues = datasets.flatMap(ds => ds.data);
  const rawMax = Math.max(...allValues, 0);
  const maxVal = niceMax(rawMax);
  const GRID_LINES = 5;

  const yAxisW = 0.55;
  const xAxisH = 0.4;
  const legendH = 0.4;
  const pad = 0.05;

  const plotX = area.x + yAxisW;
  const plotY = area.y + pad;
  const plotW = area.w - yAxisW - pad;
  const plotH = area.h - xAxisH - legendH - pad;

  slide.addShape(pptx.ShapeType.rect, {
    x: area.x, y: area.y, w: area.w, h: area.h,
    fill: { color: COLORS.chartBg },
    line: { color: COLORS.gridLine, width: 0.5 },
    rectRadius: 0.08,
  });

  for (let g = 0; g <= GRID_LINES; g++) {
    const frac = g / GRID_LINES;
    const lineY = plotY + plotH - frac * plotH;
    const val = (frac * maxVal);

    slide.addShape(pptx.ShapeType.line, {
      x: plotX, y: lineY, w: plotW, h: 0,
      line: { color: COLORS.gridLine, width: 0.5, dashType: "dash" },
    });

    slide.addText(formatValue(val), {
      x: area.x, y: lineY - 0.12, w: yAxisW - 0.05, h: 0.24,
      fontSize: 7, color: COLORS.mutedText, fontFace: "Calibri",
      align: "right", valign: "middle",
    });
  }

  slide.addShape(pptx.ShapeType.line, {
    x: plotX, y: plotY, w: 0, h: plotH,
    line: { color: COLORS.border, width: 1 },
  });
  slide.addShape(pptx.ShapeType.line, {
    x: plotX, y: plotY + plotH, w: plotW, h: 0,
    line: { color: COLORS.border, width: 1 },
  });

  const groupW = plotW / numCats;
  const groupPad = groupW * 0.12;
  const barTotalW = groupW - 2 * groupPad;
  const barW = barTotalW / numSeries;
  const barGap = numSeries > 1 ? Math.min(barW * 0.08, 0.03) : 0;
  const actualBarW = barW - barGap;

  for (let cat = 0; cat < numCats; cat++) {
    for (let s = 0; s < numSeries; s++) {
      const val = datasets[s]!.data[cat] ?? 0;
      if (val <= 0) continue;

      const barH = Math.max((val / maxVal) * plotH, 0.02);
      const bx = plotX + cat * groupW + groupPad + s * barW + barGap / 2;
      const by = plotY + plotH - barH;

      slide.addShape(pptx.ShapeType.rect, {
        x: bx, y: by, w: actualBarW, h: barH,
        fill: { color: seriesColor(s) },
        rectRadius: Math.min(actualBarW * 0.15, 0.04),
      });

      if (actualBarW >= 0.3) {
        slide.addText(formatValue(val), {
          x: bx, y: by - 0.2, w: actualBarW, h: 0.2,
          fontSize: 6, color: COLORS.bodyText, fontFace: "Calibri",
          align: "center", valign: "bottom",
        });
      }
    }

    const truncLabel = labels[cat]!.length > 12
      ? labels[cat]!.slice(0, 11) + "…"
      : labels[cat]!;
    slide.addText(truncLabel, {
      x: plotX + cat * groupW, y: plotY + plotH + 0.02,
      w: groupW, h: xAxisH - 0.05,
      fontSize: 7, color: COLORS.bodyText, fontFace: "Calibri",
      align: "center", valign: "top",
    });
  }

  drawLegend(pptx, slide, datasets, area.x + yAxisW, plotY + plotH + xAxisH, plotW, legendH);
}

function drawLineChart(
  pptx: _PptxGenJSImport,
  slide: _PptxGenJSImport.Slide,
  chart: ChartData,
  area: Rect,
): void {
  const { labels, datasets } = chart.data;
  const numCats = labels.length;

  const allValues = datasets.flatMap(ds => ds.data);
  const rawMax = Math.max(...allValues, 0);
  const maxVal = niceMax(rawMax);
  const GRID_LINES = 5;

  const yAxisW = 0.55;
  const xAxisH = 0.4;
  const legendH = 0.4;
  const pad = 0.05;

  const plotX = area.x + yAxisW;
  const plotY = area.y + pad;
  const plotW = area.w - yAxisW - pad;
  const plotH = area.h - xAxisH - legendH - pad;

  slide.addShape(pptx.ShapeType.rect, {
    x: area.x, y: area.y, w: area.w, h: area.h,
    fill: { color: COLORS.chartBg },
    line: { color: COLORS.gridLine, width: 0.5 },
    rectRadius: 0.08,
  });

  for (let g = 0; g <= GRID_LINES; g++) {
    const frac = g / GRID_LINES;
    const lineY = plotY + plotH - frac * plotH;
    slide.addShape(pptx.ShapeType.line, {
      x: plotX, y: lineY, w: plotW, h: 0,
      line: { color: COLORS.gridLine, width: 0.5, dashType: "dash" },
    });
    slide.addText(formatValue(frac * maxVal), {
      x: area.x, y: lineY - 0.12, w: yAxisW - 0.05, h: 0.24,
      fontSize: 7, color: COLORS.mutedText, fontFace: "Calibri",
      align: "right", valign: "middle",
    });
  }

  const step = numCats > 1 ? plotW / (numCats - 1) : plotW;

  for (let s = 0; s < datasets.length; s++) {
    const ds = datasets[s]!;
    const color = seriesColor(s);

    for (let i = 0; i < numCats; i++) {
      const val = ds.data[i] ?? 0;
      const cx = plotX + (numCats > 1 ? i * step : plotW / 2);
      const cy = plotY + plotH - (val / maxVal) * plotH;
      const dotSize = 0.1;

      slide.addShape(pptx.ShapeType.ellipse, {
        x: cx - dotSize / 2, y: cy - dotSize / 2, w: dotSize, h: dotSize,
        fill: { color },
      });

      if (i < numCats - 1) {
        const nextVal = ds.data[i + 1] ?? 0;
        const nx = plotX + (i + 1) * step;
        const ny = plotY + plotH - (nextVal / maxVal) * plotH;
        const lx = Math.min(cx, nx);
        const ly = Math.min(cy, ny);
        const lw = Math.abs(nx - cx);
        const lh = Math.abs(ny - cy);

        slide.addShape(pptx.ShapeType.line, {
          x: lx, y: ly, w: Math.max(lw, 0.01), h: Math.max(lh, 0.01),
          line: { color, width: 2 },
          flipV: ny < cy,
          flipH: nx < cx,
        });
      }
    }
  }

  for (let i = 0; i < numCats; i++) {
    const cx = plotX + (numCats > 1 ? i * step : plotW / 2);
    const truncLabel = labels[i]!.length > 12 ? labels[i]!.slice(0, 11) + "…" : labels[i]!;
    const lblW = Math.max(step * 0.9, 0.5);
    slide.addText(truncLabel, {
      x: cx - lblW / 2, y: plotY + plotH + 0.02, w: lblW, h: xAxisH - 0.05,
      fontSize: 7, color: COLORS.bodyText, fontFace: "Calibri",
      align: "center", valign: "top",
    });
  }

  drawLegend(pptx, slide, datasets, area.x + yAxisW, plotY + plotH + xAxisH, plotW, legendH);
}

function drawPieChart(
  pptx: _PptxGenJSImport,
  slide: _PptxGenJSImport.Slide,
  chart: ChartData,
  area: Rect,
): void {
  const { labels, datasets } = chart.data;
  const ds = datasets[0];
  if (!ds) return;

  const total = ds.data.reduce((s, v) => s + Math.max(v, 0), 0);
  if (total <= 0) return;

  slide.addShape(pptx.ShapeType.rect, {
    x: area.x, y: area.y, w: area.w, h: area.h,
    fill: { color: COLORS.chartBg },
    line: { color: COLORS.gridLine, width: 0.5 },
    rectRadius: 0.08,
  });

  const barH = 0.6;
  const barY = area.y + (area.h - barH) / 2 - 0.3;
  const barX = area.x + 0.3;
  const barW = area.w - 0.6;

  let offset = 0;
  for (let i = 0; i < labels.length; i++) {
    const val = Math.max(ds.data[i] ?? 0, 0);
    const pct = val / total;
    const segW = pct * barW;
    if (segW < 0.01) { offset += segW; continue; }

    slide.addShape(pptx.ShapeType.rect, {
      x: barX + offset, y: barY, w: segW, h: barH,
      fill: { color: seriesColor(i) },
    });

    if (segW > 0.4) {
      slide.addText(`${(pct * 100).toFixed(0)}%`, {
        x: barX + offset, y: barY, w: segW, h: barH,
        fontSize: 10, bold: true, color: COLORS.white, fontFace: "Calibri",
        align: "center", valign: "middle",
      });
    }

    offset += segW;
  }

  const legendY = barY + barH + 0.25;
  const rowH = 0.28;
  const colW = Math.min(area.w / Math.min(labels.length, 3), 3.5);

  for (let i = 0; i < labels.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lx = area.x + 0.3 + col * colW;
    const ly = legendY + row * rowH;
    const pct = ((Math.max(ds.data[i] ?? 0, 0)) / total * 100).toFixed(0);

    slide.addShape(pptx.ShapeType.rect, {
      x: lx, y: ly + 0.04, w: 0.15, h: 0.15,
      fill: { color: seriesColor(i) },
      rectRadius: 0.02,
    });
    slide.addText(`${labels[i]} (${pct}%)`, {
      x: lx + 0.2, y: ly, w: colW - 0.25, h: rowH,
      fontSize: 8, color: COLORS.bodyText, fontFace: "Calibri",
      valign: "middle",
    });
  }
}

function drawLegend(
  pptx: _PptxGenJSImport,
  slide: _PptxGenJSImport.Slide,
  datasets: ChartData["data"]["datasets"],
  x: number,
  y: number,
  w: number,
  _h: number,
): void {
  if (datasets.length <= 1 && datasets[0]?.label === "Series 1") return;

  const itemW = Math.min(w / datasets.length, 2.5);
  const totalW = itemW * datasets.length;
  const startX = x + (w - totalW) / 2;

  for (let i = 0; i < datasets.length; i++) {
    const ix = startX + i * itemW;
    slide.addShape(pptx.ShapeType.rect, {
      x: ix, y: y + 0.06, w: 0.15, h: 0.15,
      fill: { color: seriesColor(i) },
      rectRadius: 0.02,
    });
    slide.addText(datasets[i]!.label, {
      x: ix + 0.2, y: y, w: itemW - 0.25, h: 0.3,
      fontSize: 8, color: COLORS.bodyText, fontFace: "Calibri",
      valign: "middle",
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Main chart dispatcher                                              */
/* ------------------------------------------------------------------ */

function addShapeChart(
  pptx: _PptxGenJSImport,
  slide: _PptxGenJSImport.Slide,
  rawChart: unknown,
  layout: Rect & { titleX?: number; titleY?: number; titleW?: number },
): boolean {
  const chart = sanitizeChart(rawChart);

  if (!chart) {
    console.warn("[pptxGenerator] Chart skipped (invalid data):", (rawChart as Record<string, unknown>)?.title);
    if (layout.titleX != null && layout.titleY != null && layout.titleW != null) {
      slide.addText(safeString((rawChart as Record<string, unknown>)?.title, "Chart"), {
        x: layout.titleX, y: layout.titleY, w: layout.titleW, h: 0.5,
        fontSize: 13, bold: true, color: COLORS.titleText, fontFace: "Arial",
      });
    }
    slide.addText("No chart data available for export.", {
      x: layout.x, y: layout.y, w: layout.w, h: 0.4,
      fontSize: 11, color: COLORS.mutedText, fontFace: "Arial", italic: true,
    });
    return false;
  }

  if (layout.titleX != null && layout.titleY != null && layout.titleW != null) {
    slide.addText(chart.title, {
      x: layout.titleX, y: layout.titleY, w: layout.titleW, h: 0.5,
      fontSize: 13, bold: true, color: COLORS.titleText, fontFace: "Arial",
    });
  }

  const area: Rect = { x: layout.x, y: layout.y, w: layout.w, h: layout.h };

  console.log(`[pptxGenerator] Drawing shape chart: type=${chart.type}, series=${chart.data.datasets.length}, points=${chart.data.labels.length}`);

  try {
    switch (chart.type) {
      case "line":
        drawLineChart(pptx, slide, chart, area);
        break;
      case "pie":
        drawPieChart(pptx, slide, chart, area);
        break;
      case "bar":
      case "area":
      case "radar":
      default:
        drawBarChart(pptx, slide, chart, area);
        break;
    }
    console.log(`[pptxGenerator] Chart drawn: "${chart.title}"`);
    return true;
  } catch (err) {
    console.error(`[pptxGenerator] Failed to draw chart "${chart.title}":`, err);
    slide.addText(`Chart error: ${chart.title}`, {
      x: layout.x, y: layout.y, w: layout.w, h: 0.4,
      fontSize: 11, color: COLORS.mutedText, fontFace: "Arial", italic: true,
    });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Slide builders                                                     */
/* ------------------------------------------------------------------ */

function deduplicateActions(result: AnalysisResult): ActionItem[] {
  const seen = new Set<string>();
  const all: ActionItem[] = [];
  for (const slide of result.slides) {
    if (!slide.actionPlan) continue;
    for (const action of slide.actionPlan.actions) {
      const key = action.task.toLowerCase().trim().replace(/[^\w\s]/g, "");
      if (!seen.has(key)) { seen.add(key); all.push(action); }
    }
  }
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return all.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
}

function addAccentBar(pptx: _PptxGenJSImport, slide: _PptxGenJSImport.Slide): void {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: COLORS.primary },
  });
}

function addTitleSlide(pptx: _PptxGenJSImport, result: AnalysisResult): void {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.primary };
  const displayName = result.fileName.replace(/\.(pptx?|PPTX?)$/, "");

  slide.addText(displayName, {
    x: 0.8, y: 1.5, w: 11.7, h: 1.2,
    fontSize: 36, bold: true, color: COLORS.white,
    align: "center", fontFace: "Calibri",
  });
  slide.addText("AI-Powered Analysis Report", {
    x: 0.8, y: 2.8, w: 11.7, h: 0.6,
    fontSize: 18, color: "c7d2fe", align: "center", fontFace: "Calibri",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 5.4, y: 3.7, w: 2.5, h: 0.04, fill: { color: "a5b4fc" },
  });
  slide.addText(result.overallSummary, {
    x: 1.5, y: 4.2, w: 10.3, h: 1.5,
    fontSize: 14, color: "e0e7ff", align: "center", fontFace: "Calibri",
    valign: "top", wrap: true,
  });
  slide.addText(`${result.totalSlides} slides analyzed`, {
    x: 0.8, y: 6.5, w: 11.7, h: 0.5,
    fontSize: 11, color: "a5b4fc", align: "center", fontFace: "Calibri",
  });
}

function addAnalysisSlide(
  pptx: _PptxGenJSImport,
  slideData: AnalysisResult["slides"][number],
  hasChart: boolean,
): number {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addAccentBar(pptx, slide);

  slide.addText(`Slide ${slideData.slideNumber}: ${slideData.title}`, {
    x: 0.6, y: 0.3, w: 12, h: 0.7,
    fontSize: 22, bold: true, color: COLORS.titleText,
    fontFace: "Calibri", valign: "middle",
  });
  slide.addText(slideData.summary, {
    x: 0.6, y: 1.1, w: 12, h: 0.6,
    fontSize: 12, color: COLORS.mutedText,
    fontFace: "Calibri", wrap: true, valign: "top",
  });

  const contentW = hasChart ? 5.5 : 12;
  const keyPointRows: _PptxGenJSImport.TextProps[] = slideData.keyPoints.map(kp => ({
    text: kp,
    options: {
      fontSize: 13, color: COLORS.bodyText, fontFace: "Calibri",
      bullet: { type: "bullet" as const }, paraSpaceAfter: 6,
    },
  }));

  if (keyPointRows.length > 0) {
    slide.addText(
      [{
        text: "Key Points",
        options: { fontSize: 14, bold: true, color: COLORS.primary, fontFace: "Calibri", paraSpaceAfter: 10 },
      }, ...keyPointRows],
      { x: 0.6, y: 1.9, w: contentW, h: 5, valign: "top", wrap: true },
    );
  }

  let chartsAdded = 0;
  if (hasChart && slideData.charts[0]) {
    if (addShapeChart(pptx, slide, slideData.charts[0], {
      titleX: 6.6, titleY: 1.9, titleW: 6,
      x: 6.6, y: 2.5, w: 6, h: 4.2,
    })) chartsAdded++;
  }
  return chartsAdded;
}

function addExtraChartSlide(
  pptx: _PptxGenJSImport,
  slideNumber: number,
  chart: AnalysisResult["slides"][number]["charts"][number],
): boolean {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addAccentBar(pptx, slide);

  slide.addText(`Slide ${slideNumber}: ${(chart as unknown as Record<string, unknown>).title ?? "Chart"}`, {
    x: 0.6, y: 0.3, w: 12, h: 0.7,
    fontSize: 20, bold: true, color: COLORS.titleText, fontFace: "Calibri",
  });
  slide.addText(String((chart as unknown as Record<string, unknown>).description ?? ""), {
    x: 0.6, y: 1.1, w: 12, h: 0.5,
    fontSize: 12, color: COLORS.mutedText, fontFace: "Calibri",
  });

  return addShapeChart(pptx, slide, chart, { x: 1.5, y: 1.8, w: 10, h: 5.2 });
}

function addActionPlanSlides(pptx: _PptxGenJSImport, actions: ActionItem[]): void {
  if (actions.length === 0) return;
  const ROWS_PER_SLIDE = 8;
  const priorityStyle = (p: string) => {
    const s = COLORS[p as keyof typeof COLORS] as { bg: string; text: string } | undefined;
    return s ?? { bg: "f1f5f9", text: "334155" };
  };

  for (let page = 0; page < actions.length; page += ROWS_PER_SLIDE) {
    const slide = pptx.addSlide();
    slide.background = { color: COLORS.white };
    addAccentBar(pptx, slide);

    const pageLabel = actions.length > ROWS_PER_SLIDE
      ? ` (${Math.floor(page / ROWS_PER_SLIDE) + 1}/${Math.ceil(actions.length / ROWS_PER_SLIDE)})`
      : "";
    slide.addText(`Consolidated Action Plan${pageLabel}`, {
      x: 0.6, y: 0.3, w: 12, h: 0.7,
      fontSize: 22, bold: true, color: COLORS.titleText, fontFace: "Calibri",
    });

    const headerRow: _PptxGenJSImport.TableCell[] = [
      { text: "#", options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 10, align: "center" } },
      { text: "Priority", options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 10 } },
      { text: "Task", options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 10 } },
      { text: "Category", options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 10 } },
      { text: "Timeline", options: { bold: true, color: COLORS.white, fill: { color: COLORS.primary }, fontSize: 10 } },
    ];
    const batch = actions.slice(page, page + ROWS_PER_SLIDE);
    const dataRows: _PptxGenJSImport.TableCell[][] = batch.map((action, idx) => {
      const ps = priorityStyle(action.priority);
      return [
        { text: String(page + idx + 1), options: { fontSize: 10, align: "center" as const, color: COLORS.bodyText } },
        { text: action.priority.toUpperCase(), options: { fontSize: 9, bold: true, color: ps.text, fill: { color: ps.bg }, align: "center" as const } },
        { text: action.task, options: { fontSize: 10, color: COLORS.bodyText } },
        { text: action.category || "-", options: { fontSize: 10, color: COLORS.mutedText } },
        { text: action.suggestedTimeline || "-", options: { fontSize: 10, color: COLORS.mutedText } },
      ];
    });

    slide.addTable([headerRow, ...dataRows], {
      x: 0.4, y: 1.3, w: 12.5,
      colW: [0.5, 1.2, 5.5, 2.5, 2.8],
      border: { type: "solid", pt: 0.5, color: COLORS.border },
      rowH: 0.55, autoPage: false, margin: [4, 6, 4, 6],
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Public entry point                                                 */
/* ------------------------------------------------------------------ */

export async function generateReport(result: AnalysisResult): Promise<Buffer> {
  const pptx = new _PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "PPT Analyzer";
  pptx.title = `Analysis: ${result.fileName}`;

  const totalChartsInInput = result.slides.reduce((sum, s) => {
    return sum + (Array.isArray(s.charts) ? s.charts.length : 0);
  }, 0);
  console.log(`[pptxGenerator] Starting report: ${result.slides.length} slides, ${totalChartsInInput} charts`);

  addTitleSlide(pptx, result);

  let chartsAdded = 0;
  for (const slideData of result.slides) {
    const charts = Array.isArray(slideData.charts) ? slideData.charts : [];
    const hasChart = charts.length > 0;

    if (hasChart) {
      console.log(`[pptxGenerator] Slide ${slideData.slideNumber}: ${charts.length} chart(s) — [${charts.map(c => c?.type).join(", ")}]`);
    }

    chartsAdded += addAnalysisSlide(pptx, slideData, hasChart);

    for (let i = 1; i < charts.length; i++) {
      if (addExtraChartSlide(pptx, slideData.slideNumber, charts[i]!)) chartsAdded++;
    }
  }

  console.log(`[pptxGenerator] Charts drawn: ${chartsAdded}/${totalChartsInInput}`);

  addActionPlanSlides(pptx, deduplicateActions(result));

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}
