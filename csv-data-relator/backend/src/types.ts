export type PrimitiveValue = string | number | null;

export type DataRow = Record<string, PrimitiveValue>;

export interface ParsedCsv {
  headers: string[];
  rows: DataRow[];
}

export type ColumnType = "number" | "date" | "string";

export interface ColumnInference {
  type: ColumnType;
  sampleValues: string[];
}
