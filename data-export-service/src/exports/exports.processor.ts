import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { stringify } from 'csv-stringify';
import { v4 as uuidv4 } from 'uuid';
import { ExportsService, EXPORT_QUEUE_NAME } from './exports.service';
import { S3Service } from '../s3/s3.service';
import { EmailService } from '../email/email.service';
import { ExportJob } from './entities/export-job.entity';
import { ExportStatus, PaginationStrategy } from './enums';

interface ProcessExportJobData {
  exportJobId: string;
}

@Processor(EXPORT_QUEUE_NAME, { concurrency: 5 })
export class ExportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportsProcessor.name);
  private readonly maxPages: number;

  constructor(
    private readonly exportsService: ExportsService,
    private readonly s3Service: S3Service,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.maxPages = this.configService.get<number>('export.maxPages', 10000);
  }

  async process(job: Job<ProcessExportJobData>): Promise<void> {
    const { exportJobId } = job.data;
    this.logger.log(`Processing export ${exportJobId} (attempt ${job.attemptsMade + 1})`);

    const exportJob = await this.exportsService.findById(exportJobId);
    if (!exportJob) {
      this.logger.error(`Export job ${exportJobId} not found — skipping`);
      return;
    }

    await this.exportsService.updateJob(exportJobId, {
      status: ExportStatus.PROCESSING,
      startedAt: new Date(),
      attempts: job.attemptsMade + 1,
    });

    const tmpFilePath = path.join(os.tmpdir(), `export-${exportJobId}-${uuidv4()}.csv`);

    try {
      const { totalRecords, pagesProcessed } = await this.fetchAndWriteCsv(exportJob, tmpFilePath, job);

      const fileName = exportJob.fileName
        ? `${exportJob.fileName}.csv`
        : `export-${exportJobId}.csv`;
      const s3Key = `exports/${exportJobId}/${fileName}`;

      const fileStream = fs.createReadStream(tmpFilePath);
      await this.s3Service.uploadStream(s3Key, fileStream);

      const downloadUrl = await this.s3Service.getPresignedUrl(s3Key);

      await this.exportsService.updateJob(exportJobId, {
        status: ExportStatus.COMPLETED,
        s3Key,
        downloadUrl,
        totalRecords,
        pagesProcessed,
        completedAt: new Date(),
        errorMessage: null,
      });

      await this.emailService.sendExportReadyEmail(
        exportJob.email,
        downloadUrl,
        fileName,
        totalRecords,
      );

      this.logger.log(
        `Export ${exportJobId} completed — ${totalRecords} records, ${pagesProcessed} pages`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Export ${exportJobId} failed: ${errorMessage}`);

      const maxAttempts = job.opts.attempts ?? 3;
      if (job.attemptsMade + 1 >= maxAttempts) {
        await this.exportsService.updateJob(exportJobId, {
          status: ExportStatus.FAILED,
          errorMessage: `Failed after ${job.attemptsMade + 1} attempts. Last error: ${errorMessage}`,
        });
      }

      throw error;
    } finally {
      try {
        await fs.promises.unlink(tmpFilePath);
      } catch {
        // temp file may not exist if we failed early
      }
    }
  }

  /**
   * Iterates through API pages, writing rows to a CSV file via streaming.
   * Memory footprint stays constant regardless of total record count.
   */
  private async fetchAndWriteCsv(
    exportJob: ExportJob,
    filePath: string,
    bullJob: Job,
  ): Promise<{ totalRecords: number; pagesProcessed: number }> {
    let totalRecords = 0;
    let pagesProcessed = 0;
    let headersWritten = false;

    const csvStringifier = stringify({ header: false });
    const writeStream = fs.createWriteStream(filePath);
    csvStringifier.pipe(writeStream);

    const drainPromise = new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    try {
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore && pagesProcessed < this.maxPages) {
        const url = this.buildPageUrl(exportJob, pagesProcessed, cursor);
        const records = await this.fetchPage(url, exportJob.headers, exportJob.dataPath);

        if (!records || records.length === 0) {
          hasMore = false;
          break;
        }

        if (!headersWritten) {
          const columns = this.extractColumns(records[0]);
          csvStringifier.write(columns);
          headersWritten = true;
        }

        for (const record of records) {
          const row = this.flattenRecord(record);
          csvStringifier.write(Object.values(row));
        }

        totalRecords += records.length;
        pagesProcessed++;

        if (exportJob.paginationStrategy === PaginationStrategy.CURSOR) {
          const responseData = await this.fetchRawResponse(url, exportJob.headers);
          const nextCursor = this.extractByPath(responseData, exportJob.cursorPath ?? 'meta.nextCursor');
          cursor = typeof nextCursor === 'string' ? nextCursor : null;
          if (!cursor) hasMore = false;
        }

        if (records.length < exportJob.pageSize) {
          hasMore = false;
        }

        if (pagesProcessed % 10 === 0) {
          await this.exportsService.updateJob(exportJob.id, {
            totalRecords,
            pagesProcessed,
          });
          await bullJob.updateProgress(pagesProcessed);
          this.logger.debug(
            `Export ${exportJob.id}: page ${pagesProcessed}, ${totalRecords} records so far`,
          );
        }
      }
    } finally {
      csvStringifier.end();
    }

    await drainPromise;
    return { totalRecords, pagesProcessed };
  }

  private buildPageUrl(
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
        url.searchParams.set('offset', String(currentPage * exportJob.pageSize));
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

  private async fetchPage(
    url: string,
    headers: Record<string, string> | null,
    dataPath: string,
  ): Promise<Record<string, unknown>[]> {
    const response = await this.fetchRawResponse(url, headers);
    const data = this.extractByPath(response, dataPath);

    if (Array.isArray(data)) {
      return data as Record<string, unknown>[];
    }

    return [];
  }

  private async fetchRawResponse(
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
      throw new Error(`API responded with ${response.status}: ${response.statusText} for ${url}`);
    }

    return response.json();
  }

  /**
   * Extracts a value from a nested object using dot-notation path.
   * e.g. "data.items" → obj.data.items
   */
  private extractByPath(obj: unknown, path: string): unknown {
    let current: unknown = obj;

    for (const key of path.split('.')) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[key];
    }

    return current;
  }

  /**
   * Flattens a nested record into a single-level object with dot-notation keys.
   * { user: { name: "Alice" } } → { "user.name": "Alice" }
   */
  private flattenRecord(
    obj: Record<string, unknown>,
    prefix = '',
  ): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this.flattenRecord(value as Record<string, unknown>, fullKey));
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
  private extractColumns(record: Record<string, unknown>): string[] {
    return Object.keys(this.flattenRecord(record));
  }
}
