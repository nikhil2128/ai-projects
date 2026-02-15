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

export interface UploadResponse {
  sessionId: string;
  files: FileAnalysis[];
  commonKey: string | null;
  totalFiles: number;
}

export interface MergeResult {
  mergedHeaders: string[];
  previewRows: Record<string, unknown>[]; // Only first 100 rows (was mergedRows)
  columnTypes: Record<string, ColumnType>;
  totalRows: number;
  commonKey: string;
  fileAnalyses: FileAnalysis[];
  unmatchedKeys: Record<string, string[]>;
}

export interface MergeResponse {
  result: MergeResult;
  // csvContent removed — download via streaming GET endpoint
}

export type AppStep = "upload" | "analyze" | "result";
