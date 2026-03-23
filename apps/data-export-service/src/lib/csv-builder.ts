import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { stringify } from 'csv-stringify';
import { v4 as uuidv4 } from 'uuid';
import { ExportJob, PaginationStrategy } from '../types';

export interface CsvBuildResult {
  totalRecords: number;
  pagesProcessed: number;
  filePath: string;
}

export interface ProgressCallback {
  (pagesProcessed: number, totalRecords: number): Promise<void>;
}

/**
 * Iterates through API pages and writes rows to a CSV file via streaming.
 * Memory footprint stays constant regardless of total record count.
 */
export async function fetchAndBuildCsv(
  exportJob: ExportJob,
  maxPages: number,
  onProgress?: ProgressCallback,
): Promise<CsvBuildResult> {
  const tmpFilePath = path.join(
    os.tmpdir(),
    `export-${exportJob.id}-${uuidv4()}.csv`,
  );

  let totalRecords = 0;
  let pagesProcessed = 0;
  let headersWritten = false;

  const csvStringifier = stringify({ header: false });
  const writeStream = fs.createWriteStream(tmpFilePath);
  csvStringifier.pipe(writeStream);

  const drainPromise = new Promise<void>((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  try {
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore && pagesProcessed < maxPages) {
      const url = buildPageUrl(exportJob, pagesProcessed, cursor);
      const records = await fetchPage(
        url,
        exportJob.headers,
        exportJob.dataPath,
      );

      if (!records || records.length === 0) {
        hasMore = false;
        break;
      }

      if (!headersWritten) {
        const columns = extractColumns(records[0]);
        csvStringifier.write(columns);
        headersWritten = true;
      }

      for (const record of records) {
        const row = flattenRecord(record);
        csvStringifier.write(Object.values(row));
      }

      totalRecords += records.length;
      pagesProcessed++;

      if (exportJob.paginationStrategy === PaginationStrategy.CURSOR) {
        const responseData = await fetchRawResponse(url, exportJob.headers);
        const nextCursor = extractByPath(
          responseData,
          exportJob.cursorPath ?? 'meta.nextCursor',
        );
        cursor = typeof nextCursor === 'string' ? nextCursor : null;
        if (!cursor) hasMore = false;
      }

      if (records.length < exportJob.pageSize) {
        hasMore = false;
      }

      if (pagesProcessed % 10 === 0 && onProgress) {
        await onProgress(pagesProcessed, totalRecords);
      }
    }
  } finally {
    csvStringifier.end();
  }

  await drainPromise;
  return { totalRecords, pagesProcessed, filePath: tmpFilePath };
}

export function buildPageUrl(
  exportJob: ExportJob,
  currentPage: number,
  cursor: string | null,
): string {
  const url = new URL(exportJob.apiUrl);

  if (exportJob.queryParams) {
    for (const [key, value] of Object.entries(exportJob.queryParams)) {
      url.searchParams.set(key, value);
    }
  }

  switch (exportJob.paginationStrategy) {
    case PaginationStrategy.PAGE:
      url.searchParams.set('page', String(currentPage + 1));
      url.searchParams.set('limit', String(exportJob.pageSize));
      break;

    case PaginationStrategy.OFFSET:
      url.searchParams.set(
        'offset',
        String(currentPage * exportJob.pageSize),
      );
      url.searchParams.set('limit', String(exportJob.pageSize));
      break;

    case PaginationStrategy.CURSOR:
      url.searchParams.set('limit', String(exportJob.pageSize));
      if (cursor) {
        const cursorParam = exportJob.cursorParam ?? 'cursor';
        url.searchParams.set(cursorParam, cursor);
      }
      break;
  }

  return url.toString();
}

export async function fetchPage(
  url: string,
  headers: Record<string, string> | null,
  dataPath: string,
): Promise<Record<string, unknown>[]> {
  const response = await fetchRawResponse(url, headers);
  const data = extractByPath(response, dataPath);

  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }

  return [];
}

export async function fetchRawResponse(
  url: string,
  headers: Record<string, string> | null,
): Promise<unknown> {
  const fetchHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  const response = await fetch(url, {
    method: 'GET',
    headers: fetchHeaders,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `API responded with ${response.status}: ${response.statusText} for ${url}`,
    );
  }

  return response.json();
}

/**
 * Extracts a value from a nested object using dot-notation path.
 * e.g. "data.items" -> obj.data.items
 */
export function extractByPath(obj: unknown, path: string): unknown {
  let current: unknown = obj;

  for (const key of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Flattens a nested record into a single-level object with dot-notation keys.
 * { user: { name: "Alice" } } -> { "user.name": "Alice" }
 */
export function flattenRecord(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenRecord(value as Record<string, unknown>, fullKey),
      );
    } else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value);
    } else {
      result[fullKey] = value == null ? '' : String(value);
    }
  }

  return result;
}

/**
 * Extracts flattened column names from the first record.
 */
export function extractColumns(record: Record<string, unknown>): string[] {
  return Object.keys(flattenRecord(record));
}
