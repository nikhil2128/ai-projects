export type DiffLineType = "context" | "add" | "remove";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

export interface FieldDiff {
  field: string;
  lines: DiffLine[];
}

function serializeValue(value: unknown, exists: boolean): string[] {
  if (!exists) return ["<missing>"];
  if (typeof value === "string") {
    return value.split("\n");
  }

  const serialized = JSON.stringify(value ?? null, null, 2);
  return (serialized ?? "null").split("\n");
}

function diffLines(previous: string[], current: string[]): DiffLine[] {
  const n = previous.length;
  const m = current.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (previous[i] === current[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (previous[i] === current[j]) {
      lines.push({ type: "context", text: previous[i] });
      i += 1;
      j += 1;
      continue;
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({ type: "remove", text: previous[i] });
      i += 1;
    } else {
      lines.push({ type: "add", text: current[j] });
      j += 1;
    }
  }

  while (i < n) {
    lines.push({ type: "remove", text: previous[i] });
    i += 1;
  }

  while (j < m) {
    lines.push({ type: "add", text: current[j] });
    j += 1;
  }

  return lines;
}

function jsonSignature(value: unknown): string {
  return JSON.stringify(value) ?? "undefined";
}

export function buildEntryDiff(
  previousValues: Record<string, unknown>,
  currentValues: Record<string, unknown>,
  orderedFields?: string[],
): FieldDiff[] {
  const ordered = orderedFields ?? [];
  const seen = new Set<string>();
  const allFields: string[] = [];

  for (const field of ordered) {
    if (!seen.has(field)) {
      seen.add(field);
      allFields.push(field);
    }
  }

  for (const key of Object.keys(previousValues)) {
    if (!seen.has(key)) {
      seen.add(key);
      allFields.push(key);
    }
  }

  for (const key of Object.keys(currentValues)) {
    if (!seen.has(key)) {
      seen.add(key);
      allFields.push(key);
    }
  }

  return allFields
    .map((field) => {
      const prevExists = Object.prototype.hasOwnProperty.call(previousValues, field);
      const currExists = Object.prototype.hasOwnProperty.call(currentValues, field);
      const prevValue = previousValues[field];
      const currValue = currentValues[field];

      if (
        prevExists === currExists &&
        jsonSignature(prevValue) === jsonSignature(currValue)
      ) {
        return null;
      }

      return {
        field,
        lines: diffLines(
          serializeValue(prevValue, prevExists),
          serializeValue(currValue, currExists),
        ),
      } satisfies FieldDiff;
    })
    .filter((diff): diff is FieldDiff => diff !== null);
}
