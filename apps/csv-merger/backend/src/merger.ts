import fs from "fs";
import Papa from "papaparse";
import {
  findCommonKey,
  normalizeHeader,
  transformValue,
} from "./analyzer";
import {
  ColumnType,
  FileAnalysis,
  MergeResultMetadata,
} from "./types";

// ─── Constants ──────────────────────────────────────────────────
const PREVIEW_ROWS = 100; // Number of rows sent to the frontend
const CSV_WRITE_BATCH = 5_000; // Rows per batch when writing CSV to disk

// ─── Streaming Merge ────────────────────────────────────────────

/**
 * Merge multiple CSV files using streaming I/O.
 *
 * 1. Streams each file row-by-row (never loads an entire file).
 * 2. Builds one merged Map<keyValue, mergedRow> incrementally.
 * 3. Writes the merged CSV to `outputPath` in batches.
 * 4. Returns lightweight metadata + a small preview for the UI.
 */
export async function streamMergeCSVFiles(
  filePaths: string[],
  fileAnalyses: FileAnalysis[],
  outputPath: string
): Promise<MergeResultMetadata> {
  // ── Resolve common key ──────────────────────────────────────
  const commonKey = findCommonKey(fileAnalyses);
  if (!commonKey) {
    throw new Error(
      "No common column found across all uploaded files. " +
        "Ensure all files share at least one column (e.g., employee_id)."
    );
  }

  // ── Build column registry (ordered, deduplicated) ───────────
  const columnRegistry = new Map<
    string,
    { originalName: string; sourceFile: string; detectedType: ColumnType }
  >();
  const columnTypes: Record<string, ColumnType> = {};
  const orderedColumns: string[] = [commonKey];

  for (const analysis of fileAnalyses) {
    for (const col of analysis.columns) {
      if (!columnRegistry.has(col.name)) {
        columnRegistry.set(col.name, {
          originalName: col.originalName,
          sourceFile: col.sourceFile,
          detectedType: col.detectedType,
        });
        columnTypes[col.name] = col.detectedType;

        if (col.name !== commonKey) {
          orderedColumns.push(col.name);
        }
      }
    }
  }

  // ── Phase 1: Stream each file & build the merged map ────────
  const mergedMap = new Map<string, Record<string, unknown>>();
  const fileKeySets: Set<string>[] = []; // for unmatched-key detection

  for (let i = 0; i < filePaths.length; i++) {
    const analysis = fileAnalyses[i];
    const keyCol = analysis.columns.find((c) => c.name === commonKey);
    if (!keyCol) {
      fileKeySets.push(new Set());
      continue;
    }

    // Build a quick lookup: normalizedName → originalName for this file
    const colMap = new Map<string, { originalName: string; detectedType: ColumnType }>();
    for (const col of analysis.columns) {
      colMap.set(col.name, {
        originalName: col.originalName,
        detectedType: col.detectedType,
      });
    }

    const fileKeys = new Set<string>();
    fileKeySets.push(fileKeys);

    await streamFile(filePaths[i], (row) => {
      const keyValue = (row[keyCol.originalName] ?? "").trim();
      if (!keyValue) return;

      fileKeys.add(keyValue);

      let mergedRow = mergedMap.get(keyValue);
      if (!mergedRow) {
        mergedRow = {};
        mergedMap.set(keyValue, mergedRow);
      }

      // Set the key column value
      mergedRow[commonKey] = transformValue(keyValue, columnTypes[commonKey]);

      // Add columns from this file (first-file-wins for duplicates)
      for (const col of analysis.columns) {
        if (col.name === commonKey) continue;
        if (mergedRow[col.name] === undefined) {
          const rawValue = row[col.originalName] ?? "";
          mergedRow[col.name] = transformValue(rawValue, col.detectedType);
        }
      }
    });
  }

  // ── Compute unmatched keys per file ─────────────────────────
  const allKeys = new Set(mergedMap.keys());
  const unmatchedKeys: Record<string, string[]> = {};

  for (let i = 0; i < filePaths.length; i++) {
    const fileName = fileAnalyses[i].fileName;
    const fileKeys = fileKeySets[i];

    const missing: string[] = [];
    for (const key of allKeys) {
      if (!fileKeys.has(key)) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      unmatchedKeys[fileName] = missing;
    }
  }

  // Free per-file key sets
  fileKeySets.length = 0;

  // Fill missing columns with empty string
  for (const row of mergedMap.values()) {
    for (const col of orderedColumns) {
      if (row[col] === undefined) {
        row[col] = "";
      }
    }
  }

  // ── Collect preview rows ────────────────────────────────────
  const previewRows: Record<string, unknown>[] = [];
  let previewCount = 0;
  for (const row of mergedMap.values()) {
    if (previewCount >= PREVIEW_ROWS) break;
    previewRows.push({ ...row }); // shallow copy so map cleanup doesn't affect preview
    previewCount++;
  }

  // ── Human-readable headers ──────────────────────────────────
  const mergedHeaders = orderedColumns.map((col) => {
    const reg = columnRegistry.get(col);
    return reg?.originalName ?? col;
  });

  // ── Phase 2: Write merged CSV to disk in batches ────────────
  await writeMergedCSV(
    outputPath,
    mergedHeaders,
    orderedColumns,
    mergedMap
  );

  const totalRows = mergedMap.size;

  // Free the large merged map
  mergedMap.clear();

  return {
    mergedHeaders,
    previewRows,
    columnTypes,
    totalRows,
    commonKey,
    fileAnalyses,
    unmatchedKeys,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Stream through a CSV file row-by-row, calling `onRow` for each record.
 */
function streamFile(
  filePath: string,
  onRow: (row: Record<string, string>) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, "utf-8");
    let rejected = false;

    stream.on("error", (err) => {
      if (!rejected) {
        rejected = true;
        reject(new Error(`Failed to read file: ${err.message}`));
      }
    });

    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),

      step: (results: Papa.ParseStepResult<Record<string, string>>) => {
        onRow(results.data);
      },

      complete: () => {
        if (!rejected) resolve();
      },

      error: (err: Error) => {
        if (!rejected) {
          rejected = true;
          reject(err);
        }
      },
    });
  });
}

/**
 * Write the merged dataset to a CSV file on disk using batched writes.
 * This avoids building the entire CSV string in memory.
 */
function writeMergedCSV(
  outputPath: string,
  mergedHeaders: string[],
  orderedColumns: string[],
  mergedMap: Map<string, Record<string, unknown>>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(outputPath, "utf-8");

    writeStream.on("error", (err) => {
      reject(new Error(`Failed to write merged CSV: ${err.message}`));
    });

    // Write CSV header
    writeStream.write(
      Papa.unparse({ fields: mergedHeaders, data: [] }) + "\n"
    );

    // Write rows in batches
    let batch: unknown[][] = [];

    for (const row of mergedMap.values()) {
      const values = orderedColumns.map((col) => {
        const val = row[col];
        return val === null || val === undefined ? "" : val;
      });
      batch.push(values);

      if (batch.length >= CSV_WRITE_BATCH) {
        writeStream.write(Papa.unparse(batch) + "\n");
        batch = [];
      }
    }

    // Flush remaining rows
    if (batch.length > 0) {
      writeStream.write(Papa.unparse(batch) + "\n");
      batch = [];
    }

    writeStream.end(() => resolve());
  });
}
