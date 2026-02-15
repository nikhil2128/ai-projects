import fs from "fs";
import Papa from "papaparse";
import { ColumnAnalysis, ColumnType, FileAnalysis } from "./types";

// ─── Constants ──────────────────────────────────────────────────
const TYPE_SAMPLE_SIZE = 1000; // Rows to sample for type detection
const MAX_UNIQUE_TRACK = 10_000; // Cap unique-value tracking per column

// ─── Header Normalization ───────────────────────────────────────

/**
 * Normalize a column header for consistent matching across files.
 * e.g., "Employee ID", "employee_id", "EmployeeId" => "employee_id"
 */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// ─── Column Type Detection ──────────────────────────────────────

/**
 * Detect the data type of a column based on sampled values.
 */
export function detectColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter(
    (v) => v !== null && v !== undefined && v.trim() !== ""
  );

  if (nonEmpty.length === 0) return "string";

  let numberCount = 0;
  let dateCount = 0;
  let booleanCount = 0;

  for (const val of nonEmpty) {
    const trimmed = val.trim();

    // Boolean check
    if (
      ["true", "false", "yes", "no", "1", "0"].includes(trimmed.toLowerCase())
    ) {
      booleanCount++;
    }

    // Number check — handles currency, commas, percentages
    const cleaned = trimmed
      .replace(/^[\$€£¥₹]/, "")
      .replace(/[\$€£¥₹]$/, "")
      .replace(/,/g, "")
      .replace(/%$/, "")
      .trim();

    if (cleaned !== "" && !isNaN(Number(cleaned))) {
      numberCount++;
    }

    // Date check
    if (isDateLike(trimmed)) {
      dateCount++;
    }
  }

  const threshold = nonEmpty.length * 0.8;

  if (dateCount >= threshold) return "date";
  if (numberCount >= threshold) return "number";
  if (booleanCount >= threshold && numberCount < threshold) return "boolean";
  return "string";
}

function isDateLike(value: string): boolean {
  const datePatterns = [
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
    /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}$/i,
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}$/i,
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}[T ]\d{1,2}:\d{2}/,
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\s+\d{1,2}:\d{2}/,
  ];

  for (const pattern of datePatterns) {
    if (pattern.test(value.trim())) return true;
  }

  const parsed = Date.parse(value);
  if (!isNaN(parsed) && value.length > 6) {
    if (/[a-zA-Z\-\/]/.test(value)) return true;
  }

  return false;
}

// ─── Value Transformation ───────────────────────────────────────

/**
 * Transform a raw string value based on its detected column type.
 */
export function transformValue(value: string, type: ColumnType): unknown {
  if (value === null || value === undefined || value.trim() === "") {
    return "";
  }

  const trimmed = value.trim();

  switch (type) {
    case "number": {
      const cleaned = trimmed
        .replace(/^[\$€£¥₹]/, "")
        .replace(/[\$€£¥₹]$/, "")
        .replace(/,/g, "")
        .replace(/%$/, "")
        .trim();
      const num = Number(cleaned);
      return isNaN(num) ? trimmed : num;
    }

    case "boolean": {
      const lower = trimmed.toLowerCase();
      if (["true", "yes", "1"].includes(lower)) return true;
      if (["false", "no", "0"].includes(lower)) return false;
      return trimmed;
    }

    case "date": {
      try {
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split("T")[0];
        }
      } catch {
        // fall through
      }
      return trimmed;
    }

    default:
      return trimmed;
  }
}

// ─── Streaming File Analysis ────────────────────────────────────

interface ColumnStats {
  nullCount: number;
  sampleValues: string[];
  typeDetectionValues: string[];
  uniqueSet: Set<string>;
  uniqueOverflow: boolean;
}

/**
 * Analyze a CSV file using PapaParse streaming — never loads entire
 * file into memory. Enforces the max-row limit during parsing.
 */
export function streamAnalyzeFile(
  filePath: string,
  fileName: string,
  maxRows: number
): Promise<FileAnalysis> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, "utf-8");

    let headers: string[] = [];
    let rowCount = 0;
    let rowLimitExceeded = false;
    let rejected = false;
    const columnStats = new Map<string, ColumnStats>();

    stream.on("error", (err) => {
      if (!rejected) {
        rejected = true;
        reject(new Error(`Failed to read file "${fileName}": ${err.message}`));
      }
    });

    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),

      step: (
        results: Papa.ParseStepResult<Record<string, string>>,
        parser: Papa.Parser
      ) => {
        const row = results.data;

        // Capture headers on first row
        if (rowCount === 0) {
          headers = results.meta.fields ?? [];
          for (const h of headers) {
            columnStats.set(h, {
              nullCount: 0,
              sampleValues: [],
              typeDetectionValues: [],
              uniqueSet: new Set(),
              uniqueOverflow: false,
            });
          }
        }

        rowCount++;

        // Enforce row limit
        if (rowCount > maxRows) {
          rowLimitExceeded = true;
          parser.abort();
          return;
        }

        // Accumulate per-column stats (streaming — one row at a time)
        for (const header of headers) {
          const stats = columnStats.get(header)!;
          const value = row[header] ?? "";

          if (value.trim() === "") {
            stats.nullCount++;
          } else {
            if (stats.sampleValues.length < 5) {
              stats.sampleValues.push(value);
            }
            if (stats.typeDetectionValues.length < TYPE_SAMPLE_SIZE) {
              stats.typeDetectionValues.push(value);
            }
            if (!stats.uniqueOverflow) {
              stats.uniqueSet.add(value);
              if (stats.uniqueSet.size > MAX_UNIQUE_TRACK) {
                stats.uniqueOverflow = true;
              }
            }
          }
        }
      },

      complete: () => {
        if (rejected) return;

        if (rowLimitExceeded) {
          rejected = true;
          reject(
            new Error(
              `File "${fileName}" exceeds the maximum limit of ${maxRows.toLocaleString()} rows. ` +
                `Please reduce the file size and try again.`
            )
          );
          return;
        }

        const columns: ColumnAnalysis[] = headers.map((header) => {
          const stats = columnStats.get(header)!;

          const analysis: ColumnAnalysis = {
            name: normalizeHeader(header),
            originalName: header,
            detectedType: detectColumnType(stats.typeDetectionValues),
            sampleValues: stats.sampleValues,
            nullCount: stats.nullCount,
            uniqueCount: stats.uniqueOverflow
              ? MAX_UNIQUE_TRACK
              : stats.uniqueSet.size,
            sourceFile: fileName,
          };

          // Free memory eagerly
          stats.typeDetectionValues.length = 0;
          stats.uniqueSet.clear();

          return analysis;
        });

        columnStats.clear();

        resolve({
          fileName,
          headers,
          rowCount,
          columns,
        });
      },

      error: (err: Error) => {
        if (!rejected) {
          rejected = true;
          reject(new Error(`Failed to parse "${fileName}": ${err.message}`));
        }
      },
    });
  });
}

// ─── Common Key Detection ───────────────────────────────────────

/**
 * Find the common key column across all files.
 * Looks for columns present in ALL files (normalised-name matching),
 * preferring names containing "id", "key", or "code".
 */
export function findCommonKey(analyses: FileAnalysis[]): string | null {
  if (analyses.length === 0) return null;

  if (analyses.length === 1) {
    const idCol = analyses[0].columns.find(
      (c) =>
        c.name.includes("id") ||
        c.name.includes("key") ||
        c.name.includes("code")
    );
    return idCol?.name ?? analyses[0].columns[0]?.name ?? null;
  }

  const allNormalizedNames = analyses.map(
    (a) => new Set(a.columns.map((c) => c.name))
  );

  const commonNames: string[] = [];
  for (const name of allNormalizedNames[0]) {
    if (allNormalizedNames.every((set) => set.has(name))) {
      commonNames.push(name);
    }
  }

  if (commonNames.length === 0) return null;

  const idCol = commonNames.find(
    (n) => n.includes("id") || n.includes("key") || n.includes("code")
  );

  return idCol ?? commonNames[0];
}
