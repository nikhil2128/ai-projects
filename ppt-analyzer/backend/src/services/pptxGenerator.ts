import _PptxGenJSImport from "pptxgenjs";
import type { AnalysisResult, ActionItem } from "../types/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _PptxGenJS = ((_PptxGenJSImport as any).default ?? _PptxGenJSImport) as typeof _PptxGenJSImport;

const COLORS = {
  primary: "4f46e5",
  titleText: "1e293b",
  bodyText: "334155",
  mutedText: "64748b",
  white: "ffffff",
  border: "e2e8f0",
  high: { bg: "fee2e2", text: "991b1b" },
  medium: { bg: "fef3c7", text: "92400e" },
  low: { bg: "d1fae5", text: "065f46" },
};

const CHART_COLORS = [
  "6366f1", "8b5cf6", "ec4899", "f97316",
  "22c55e", "06b6d4", "eab308", "f43f5e",
];

type ChartName = "area" | "bar" | "bar3d" | "bubble" | "doughnut" | "line" | "pie" | "radar" | "scatter";
const CHART_TYPE_MAP: Record<string, ChartName> = {
  bar: "bar",
  line: "line",
  pie: "pie",
  area: "area",
  radar: "radar",
};

type ReportChart = AnalysisResult["slides"][number]["charts"][number];
type ChartSeries = {
  name: string;
  labels: string[];
  values: number[];
};

function toChartNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const sanitized = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function buildChartSeries(chart: ReportChart): ChartSeries[] {
  const labels = chart.data.labels.map((label, idx) => {
    const text = String(label ?? "").trim();
    return text || `Item ${idx + 1}`;
  });

  if (labels.length === 0 || chart.data.datasets.length === 0) {
    return [];
  }

  if (chart.type === "pie") {
    const dataset = chart.data.datasets[0];
    if (!dataset) return [];

    return [{
      name: dataset.label?.trim() || chart.title || "Series 1",
      labels,
      values: labels.map((_, idx) => toChartNumber(dataset.data[idx])),
    }];
  }

  return chart.data.datasets.map((dataset, idx) => ({
    name: dataset.label?.trim() || `Series ${idx + 1}`,
    labels,
    values: labels.map((_, labelIdx) => toChartNumber(dataset.data[labelIdx])),
  }));
}

function getChartOptions(
  chartType: ChartName,
  seriesCount: number,
  labelCount: number,
): Record<string, unknown> {
  const baseOptions = {
    showTitle: false,
    showLegend: seriesCount > 1 || chartType === "pie",
    legendPos: "b",
    legendFontSize: 9,
    chartColors: CHART_COLORS.slice(0, Math.max(seriesCount, labelCount)),
  };

  switch (chartType) {
    case "pie":
      return {
        ...baseOptions,
        showLegend: true,
        showPercent: true,
        showValue: false,
        showLeaderLines: true,
        dataLabelPosition: "bestFit",
      };
    case "radar":
      return {
        ...baseOptions,
        radarStyle: "filled",
        showValue: false,
      };
    default:
      return {
        ...baseOptions,
        showValue: true,
        valAxisLabelFontSize: 9,
        catAxisLabelFontSize: 9,
        dataLabelFontSize: 8,
      };
  }
}

function addChartBlock(
  slide: _PptxGenJSImport.Slide,
  chart: ReportChart,
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
    titleX?: number;
    titleY?: number;
    titleW?: number;
  },
): void {
  const chartType = CHART_TYPE_MAP[chart.type] ?? "bar";
  const chartData = buildChartSeries(chart);

  if (
    layout.titleX !== undefined
    && layout.titleY !== undefined
    && layout.titleW !== undefined
  ) {
    slide.addText(chart.title, {
      x: layout.titleX,
      y: layout.titleY,
      w: layout.titleW,
      h: 0.5,
      fontSize: 13,
      bold: true,
      color: COLORS.titleText,
      fontFace: "Calibri",
    });
  }

  if (chartData.length === 0) {
    slide.addText("Chart data could not be normalized for PowerPoint export.", {
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: 0.4,
      fontSize: 11,
      color: COLORS.mutedText,
      fontFace: "Calibri",
      italic: true,
    });
    return;
  }

  slide.addChart(
    chartType as _PptxGenJSImport.CHART_NAME,
    chartData,
    {
      x: layout.x,
      y: layout.y,
      w: layout.w,
      h: layout.h,
      ...getChartOptions(chartType, chartData.length, chartData[0]?.labels.length ?? 0),
    },
  );
}

function deduplicateActions(result: AnalysisResult): ActionItem[] {
  const seen = new Set<string>();
  const all: ActionItem[] = [];

  for (const slide of result.slides) {
    if (!slide.actionPlan) continue;
    for (const action of slide.actionPlan.actions) {
      const key = action.task.toLowerCase().trim().replace(/[^\w\s]/g, "");
      if (!seen.has(key)) {
        seen.add(key);
        all.push(action);
      }
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
    fontSize: 18, color: "c7d2fe",
    align: "center", fontFace: "Calibri",
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 5.4, y: 3.7, w: 2.5, h: 0.04, fill: { color: "a5b4fc" },
  });

  slide.addText(result.overallSummary, {
    x: 1.5, y: 4.2, w: 10.3, h: 1.5,
    fontSize: 14, color: "e0e7ff",
    align: "center", fontFace: "Calibri",
    valign: "top", wrap: true,
  });

  slide.addText(`${result.totalSlides} slides analyzed`, {
    x: 0.8, y: 6.5, w: 11.7, h: 0.5,
    fontSize: 11, color: "a5b4fc",
    align: "center", fontFace: "Calibri",
  });
}

function addAnalysisSlide(
  pptx: _PptxGenJSImport,
  slideData: AnalysisResult["slides"][number],
  hasChart: boolean,
): void {
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
  const keyPointRows: _PptxGenJSImport.TextProps[] = slideData.keyPoints.map((kp) => ({
    text: kp,
    options: {
      fontSize: 13,
      color: COLORS.bodyText,
      fontFace: "Calibri",
      bullet: { type: "bullet" as const },
      paraSpaceAfter: 6,
    },
  }));

  if (keyPointRows.length > 0) {
    slide.addText(
      [
        {
          text: "Key Points",
          options: {
            fontSize: 14, bold: true, color: COLORS.primary,
            fontFace: "Calibri", paraSpaceAfter: 10,
          },
        },
        ...keyPointRows,
      ],
      { x: 0.6, y: 1.9, w: contentW, h: 5, valign: "top", wrap: true },
    );
  }

  if (hasChart && slideData.charts[0]) {
    addChartBlock(slide, slideData.charts[0], {
      titleX: 6.6, titleY: 1.9, titleW: 6,
      x: 6.6, y: 2.5, w: 6, h: 4.2,
    });
  }
}

function addExtraChartSlide(
  pptx: _PptxGenJSImport,
  slideNumber: number,
  chart: AnalysisResult["slides"][number]["charts"][number],
): void {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.white };
  addAccentBar(pptx, slide);

  slide.addText(`Slide ${slideNumber}: ${chart.title}`, {
    x: 0.6, y: 0.3, w: 12, h: 0.7,
    fontSize: 20, bold: true, color: COLORS.titleText,
    fontFace: "Calibri",
  });

  slide.addText(chart.description, {
    x: 0.6, y: 1.1, w: 12, h: 0.5,
    fontSize: 12, color: COLORS.mutedText,
    fontFace: "Calibri",
  });

  addChartBlock(slide, chart, {
    x: 1.5, y: 1.8, w: 10, h: 5.2,
  });
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
      fontSize: 22, bold: true, color: COLORS.titleText,
      fontFace: "Calibri",
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
      rowH: 0.55,
      autoPage: false,
      margin: [4, 6, 4, 6],
    });
  }
}

export async function generateReport(result: AnalysisResult): Promise<Buffer> {
  const pptx = new _PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "PPT Analyzer";
  pptx.title = `Analysis: ${result.fileName}`;

  addTitleSlide(pptx, result);

  for (const slideData of result.slides) {
    const hasChart = slideData.charts.length > 0;
    addAnalysisSlide(pptx, slideData, hasChart);

    for (let i = 1; i < slideData.charts.length; i++) {
      addExtraChartSlide(pptx, slideData.slideNumber, slideData.charts[i]!);
    }
  }

  const dedupedActions = deduplicateActions(result);
  addActionPlanSlides(pptx, dedupedActions);

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}
