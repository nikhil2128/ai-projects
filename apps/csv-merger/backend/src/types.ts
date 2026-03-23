export interface ParsedCSV {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
}

export type ColumnType = "number" | "date" | "boolean" | "string";

export interface ColumnAnalysis {
  name: string;
  originalName: string;
  detectedType: ColumnType;
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
  sourceFile: string;
}

export interface FileAnalysis {
  fileName: string;
  headers: string[];
  rowCount: number;
  columns: ColumnAnalysis[];
}

/** Lightweight merge metadata sent to the frontend (no full row data). */
export interface MergeResultMetadata {
  mergedHeaders: string[];
  previewRows: Record<string, unknown>[];
  columnTypes: Record<string, ColumnType>;
  totalRows: number;
  commonKey: string;
  fileAnalyses: FileAnalysis[];
  unmatchedKeys: Record<string, string[]>;
}

/** Server-side session — stores file paths and metadata, NOT row data. */
export interface SessionData {
  filePaths: string[];
  fileNames: string[];
  fileAnalyses: FileAnalysis[];
  commonKey: string | null;
  mergedCsvPath: string | null;
  cachedMergeResult: MergeResultMetadata | null;
  uploadedAt: Date;
}
