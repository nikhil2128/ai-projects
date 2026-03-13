import { ChartSuggestion, ColumnType, MergeResult } from "./types";

const MAX_CHARTS = 6;
const MAX_CATEGORIES = 20;
const MAX_PIE_SLICES = 8;

interface ColumnInfo {
  key: string;
  label: string;
  type: ColumnType;
}

export function suggestCharts(result: MergeResult): ChartSuggestion[] {
  const { previewRows, columnTypes, commonKey, fileAnalyses } = result;

  if (previewRows.length === 0) return [];

  const keyToLabel = new Map<string, string>();
  for (const analysis of fileAnalyses) {
    for (const col of analysis.columns) {
      if (!keyToLabel.has(col.name)) {
        keyToLabel.set(col.name, col.originalName);
      }
    }
  }

  const label = (key: string) => keyToLabel.get(key) ?? key;

  const numericCols: ColumnInfo[] = [];
  const dateCols: ColumnInfo[] = [];
  const categoricalCols: ColumnInfo[] = [];

  for (const [key, type] of Object.entries(columnTypes)) {
    if (key === commonKey) continue;
    const info: ColumnInfo = { key, label: label(key), type };

    if (type === "number") {
      numericCols.push(info);
    } else if (type === "date") {
      dateCols.push(info);
    } else if (type === "string") {
      const uniqueValues = new Set(
        previewRows
          .map((row) => String(row[key] ?? ""))
          .filter((v) => v !== "" && v !== "\u2014")
      );
      if (uniqueValues.size >= 2 && uniqueValues.size <= MAX_CATEGORIES) {
        categoricalCols.push(info);
      }
    }
  }

  const suggestions: ChartSuggestion[] = [];
  let id = 0;

  // Bar charts: first numeric for each categorical column
  for (const cat of categoricalCols) {
    if (numericCols.length === 0 || suggestions.length >= MAX_CHARTS) break;
    const num = numericCols[0];
    suggestions.push({
      id: `chart-${id++}`,
      type: "bar",
      title: `${num.label} by ${cat.label}`,
      description: `Average ${num.label.toLowerCase()} grouped by ${cat.label.toLowerCase()}`,
      xKey: cat.key,
      xLabel: cat.label,
      yKeys: [num.key],
      yLabels: [num.label],
      data: aggregateBy(previewRows, cat.key, [num.key], "avg"),
    });
  }

  // Pie chart: categorical with few values + first numeric
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    const pieCat = categoricalCols.find((cat) => {
      const uniques = new Set(
        previewRows
          .map((r) => String(r[cat.key] ?? ""))
          .filter((v) => v !== "" && v !== "\u2014")
      );
      return uniques.size >= 2 && uniques.size <= MAX_PIE_SLICES;
    });
    if (pieCat && suggestions.length < MAX_CHARTS) {
      const num = numericCols[0];
      suggestions.push({
        id: `chart-${id++}`,
        type: "pie",
        title: `${num.label} Distribution by ${pieCat.label}`,
        description: `Total ${num.label.toLowerCase()} broken down by ${pieCat.label.toLowerCase()}`,
        xKey: pieCat.key,
        xLabel: pieCat.label,
        yKeys: [num.key],
        yLabels: [num.label],
        data: aggregateBy(previewRows, pieCat.key, [num.key], "sum"),
      });
    }
  }

  // Line chart: date + numeric columns
  if (dateCols.length > 0 && numericCols.length > 0 && suggestions.length < MAX_CHARTS) {
    const dateCol = dateCols[0];
    const yKeys = numericCols.slice(0, 3);
    suggestions.push({
      id: `chart-${id++}`,
      type: "line",
      title: `Trends over ${dateCol.label}`,
      description: `${yKeys.map((y) => y.label).join(", ")} plotted over ${dateCol.label.toLowerCase()}`,
      xKey: dateCol.key,
      xLabel: dateCol.label,
      yKeys: yKeys.map((y) => y.key),
      yLabels: yKeys.map((y) => y.label),
      data: sortByDate(previewRows, dateCol.key),
    });
  }

  // Scatter: two numeric columns
  if (numericCols.length >= 2 && suggestions.length < MAX_CHARTS) {
    const [x, y] = numericCols;
    suggestions.push({
      id: `chart-${id++}`,
      type: "scatter",
      title: `${x.label} vs ${y.label}`,
      description: `Correlation between ${x.label.toLowerCase()} and ${y.label.toLowerCase()}`,
      xKey: x.key,
      xLabel: x.label,
      yKeys: [y.key],
      yLabels: [y.label],
      data: previewRows
        .filter((row) => row[x.key] !== "" && row[y.key] !== "")
        .map((row) => ({
          [x.key]: Number(row[x.key]) || 0,
          [y.key]: Number(row[y.key]) || 0,
        })),
    });
  }

  // Additional bar charts with remaining numeric columns
  if (suggestions.length < MAX_CHARTS && categoricalCols.length > 0 && numericCols.length > 1) {
    for (const cat of categoricalCols) {
      for (const num of numericCols.slice(1)) {
        if (suggestions.length >= MAX_CHARTS) break;
        const exists = suggestions.some(
          (s) => s.type === "bar" && s.xKey === cat.key && s.yKeys[0] === num.key
        );
        if (!exists) {
          suggestions.push({
            id: `chart-${id++}`,
            type: "bar",
            title: `${num.label} by ${cat.label}`,
            description: `Average ${num.label.toLowerCase()} grouped by ${cat.label.toLowerCase()}`,
            xKey: cat.key,
            xLabel: cat.label,
            yKeys: [num.key],
            yLabels: [num.label],
            data: aggregateBy(previewRows, cat.key, [num.key], "avg"),
          });
        }
      }
      if (suggestions.length >= MAX_CHARTS) break;
    }
  }

  return suggestions.slice(0, MAX_CHARTS);
}

function aggregateBy(
  data: Record<string, unknown>[],
  groupKey: string,
  valueKeys: string[],
  method: "sum" | "avg"
): Record<string, unknown>[] {
  const groups = new Map<string, { row: Record<string, unknown>; count: number }>();

  for (const row of data) {
    const key = String(row[groupKey] ?? "");
    if (!key || key === "\u2014") continue;

    if (!groups.has(key)) {
      const newRow: Record<string, unknown> = { [groupKey]: key };
      for (const vk of valueKeys) newRow[vk] = 0;
      groups.set(key, { row: newRow, count: 0 });
    }

    const group = groups.get(key)!;
    group.count++;
    for (const vk of valueKeys) {
      const val = Number(row[vk]);
      if (!isNaN(val)) {
        group.row[vk] = (group.row[vk] as number) + val;
      }
    }
  }

  const result = Array.from(groups.values()).map(({ row, count }) => {
    if (method === "avg") {
      for (const vk of valueKeys) {
        row[vk] = Math.round(((row[vk] as number) / count) * 100) / 100;
      }
    }
    return row;
  });

  return result.sort((a, b) => {
    const aVal = a[valueKeys[0]] as number;
    const bVal = b[valueKeys[0]] as number;
    return bVal - aVal;
  });
}

function sortByDate(
  data: Record<string, unknown>[],
  dateKey: string
): Record<string, unknown>[] {
  return [...data]
    .filter((row) => row[dateKey] && row[dateKey] !== "" && row[dateKey] !== "\u2014")
    .sort((a, b) => {
      const dateA = new Date(String(a[dateKey])).getTime();
      const dateB = new Date(String(b[dateKey])).getTime();
      return dateA - dateB;
    });
}
