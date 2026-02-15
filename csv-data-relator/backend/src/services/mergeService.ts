import { DataRow } from "../types.js";
import {
  detectAndTransformValue,
  normalizedColumnName,
  parseCsvText,
  toCsvText,
} from "../utils/csv.js";

interface FileInput {
  filename: string;
  content: string;
}

interface MergeResult {
  headers: string[];
  rows: DataRow[];
  csvText: string;
}

const EMPLOYEE_ID_KEYS = new Set(["employeeid", "empid"]);

const findEmployeeIdHeader = (headers: string[]): string => {
  const exact = headers.find((header) => EMPLOYEE_ID_KEYS.has(normalizedColumnName(header)));
  if (exact) {
    return exact;
  }

  const contains = headers.find((header) => normalizedColumnName(header).includes("employeeid"));
  if (contains) {
    return contains;
  }

  throw new Error("Unable to find an employee id column in one or more CSV files.");
};

const addHeaderIfMissing = (headers: string[], header: string): void => {
  if (!headers.includes(header)) {
    headers.push(header);
  }
};

export const mergeCsvFiles = (files: FileInput[]): MergeResult => {
  if (!files.length) {
    throw new Error("Please upload at least one CSV file.");
  }

  const mergedHeaders: string[] = [];
  const mergedByEmployeeId = new Map<string, DataRow>();
  let canonicalEmployeeIdHeader: string | null = null;

  for (const file of files) {
    const parsed = parseCsvText(file.content);
    if (!parsed.headers.length) {
      continue;
    }

    const employeeIdHeader = findEmployeeIdHeader(parsed.headers);
    if (!canonicalEmployeeIdHeader) {
      canonicalEmployeeIdHeader = employeeIdHeader;
      addHeaderIfMissing(mergedHeaders, canonicalEmployeeIdHeader);
    }

    for (const header of parsed.headers) {
      if (header === employeeIdHeader) {
        continue;
      }
      addHeaderIfMissing(mergedHeaders, header);
    }

    for (const row of parsed.rows) {
      const employeeIdValue = row[employeeIdHeader];
      const transformedEmployeeId = detectAndTransformValue(
        employeeIdValue === null ? null : String(employeeIdValue),
      );
      if (transformedEmployeeId === null) {
        continue;
      }

      const employeeKey = String(transformedEmployeeId);
      const existing = mergedByEmployeeId.get(employeeKey) ?? {
        [canonicalEmployeeIdHeader]: transformedEmployeeId,
      };

      for (const header of parsed.headers) {
        const transformed = detectAndTransformValue(
          row[header] === null ? null : String(row[header]),
        );
        if (header === employeeIdHeader) {
          existing[canonicalEmployeeIdHeader] = transformedEmployeeId;
          continue;
        }

        if (transformed !== null) {
          existing[header] = transformed;
        } else if (!(header in existing)) {
          existing[header] = null;
        }
      }

      mergedByEmployeeId.set(employeeKey, existing);
    }
  }

  if (!canonicalEmployeeIdHeader) {
    throw new Error("No valid CSV data found in uploaded files.");
  }

  const rows = Array.from(mergedByEmployeeId.values());
  rows.sort((a, b) =>
    String(a[canonicalEmployeeIdHeader] ?? "").localeCompare(String(b[canonicalEmployeeIdHeader] ?? "")),
  );

  const csvText = toCsvText(mergedHeaders, rows);
  return { headers: mergedHeaders, rows, csvText };
};
