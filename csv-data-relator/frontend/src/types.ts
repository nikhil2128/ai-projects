export interface MergeResponse {
  headers: string[];
  rows: Array<Record<string, string | number | null>>;
  csvText: string;
  fileCount: number;
  message: string;
}
