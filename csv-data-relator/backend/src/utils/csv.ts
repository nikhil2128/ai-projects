import { DataRow, ParsedCsv, PrimitiveValue } from "../types.js";

const BOM = "\uFEFF";

const normalizeHeader = (header: string): string => {
  return header.trim().replace(/\s+/g, " ");
};

const isNumericString = (value: string): boolean => {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) {
    return false;
  }

  return /^[-+]?\d*\.?\d+$/.test(cleaned);
};

const parseNumericString = (value: string): number | null => {
  const cleaned = value.replace(/,/g, "").trim();
  if (!isNumericString(cleaned)) {
    return null;
  }

  const numberValue = Number(cleaned);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const isValidYmd = (year: number, month: number, day: number): boolean => {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() + 1 === month &&
    candidate.getUTCDate() === day
  );
};

const parseDateToIso = (value: string): string | null => {
  const trimmed = value.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  let match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (isValidYmd(year, month, day)) {
      return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY (defaulting to day-first for ambiguous cases).
  match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);

    const day = first;
    const month = second;
    if (isValidYmd(year, month, day)) {
      return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    }
  }

  return null;
};

const splitCsvLine = (input: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
};

export const parseCsvText = (rawText: string): ParsedCsv => {
  const text = rawText.replace(BOM, "").trim();
  if (!text) {
    return { headers: [], rows: [] };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const rows: DataRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    if (cells.every((cell) => !cell)) {
      continue;
    }

    const row: DataRow = {};
    headers.forEach((header, index) => {
      const rawValue = cells[index] ?? "";
      row[header] = rawValue === "" ? null : rawValue;
    });
    rows.push(row);
  }

  return { headers, rows };
};

export const detectAndTransformValue = (value: string | null): PrimitiveValue => {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const asNumber = parseNumericString(trimmed);
  if (asNumber !== null) {
    return asNumber;
  }

  const asDate = parseDateToIso(trimmed);
  if (asDate) {
    return asDate;
  }

  return trimmed;
};

const escapeCsvValue = (value: PrimitiveValue): string => {
  if (value === null) {
    return "";
  }

  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
};

export const toCsvText = (headers: string[], rows: DataRow[]): string => {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) =>
    headers.map((header) => escapeCsvValue(row[header] ?? null)).join(","),
  );

  return [headerLine, ...dataLines].join("\n");
};

export const normalizedColumnName = (header: string): string => {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
};
