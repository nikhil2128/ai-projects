import type { SQSEvent } from 'aws-lambda';
import * as fs from 'fs';
import { getConfig } from '../config';
import {
  getExportJob,
  updateExportJob,
} from '../services/export-job.service';
import * as s3 from '../services/s3.service';
import { sendExportReadyEmail } from '../services/email.service';
import { fetchAndBuildCsv } from '../lib/csv-builder';
import { ExportStatus } from '../types';

const MAX_ATTEMPTS = 3;

export async function handler(event: SQSEvent): Promise<void> {
  for (const record of event.Records) {
    const { exportJobId } = JSON.parse(record.body) as {
      exportJobId: string;
    };

    const receiveCount = Number(
      record.attributes?.ApproximateReceiveCount ?? '1',
    );

    console.log(
      `Processing export ${exportJobId} (attempt ${receiveCount})`,
    );

    await processExport(exportJobId, receiveCount);
  }
}

async function processExport(
  exportJobId: string,
  attempt: number,
): Promise<void> {
  const exportJob = await getExportJob(exportJobId);
  if (!exportJob) {
    console.error(`Export job ${exportJobId} not found — skipping`);
    return;
  }

  await updateExportJob(exportJobId, {
    status: ExportStatus.PROCESSING,
    startedAt: new Date().toISOString(),
    attempts: attempt,
  });

  const cfg = getConfig();

  try {
    const { totalRecords, pagesProcessed, filePath } =
      await fetchAndBuildCsv(
        exportJob,
        cfg.export.maxPages,
        async (pages, records) => {
          await updateExportJob(exportJobId, {
            totalRecords: records,
            pagesProcessed: pages,
          });
          console.log(
            `Export ${exportJobId}: page ${pages}, ${records} records so far`,
          );
        },
      );

    const fileName = exportJob.fileName
      ? `${exportJob.fileName}.csv`
      : `export-${exportJobId}.csv`;
    const s3Key = `exports/${exportJobId}/${fileName}`;

    const fileStream = fs.createReadStream(filePath);
    await s3.uploadStream(s3Key, fileStream);

    const downloadUrl = await s3.getPresignedUrl(s3Key);

    await updateExportJob(exportJobId, {
      status: ExportStatus.COMPLETED,
      s3Key,
      downloadUrl,
      totalRecords,
      pagesProcessed,
      completedAt: new Date().toISOString(),
      errorMessage: null,
    });

    await sendExportReadyEmail(
      exportJob.email,
      downloadUrl,
      fileName,
      totalRecords,
    );

    console.log(
      `Export ${exportJobId} completed — ${totalRecords} records, ${pagesProcessed} pages`,
    );

    try {
      await fs.promises.unlink(filePath);
    } catch {
      // temp file may not exist if we failed early
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`Export ${exportJobId} failed: ${errorMessage}`);

    if (attempt >= MAX_ATTEMPTS) {
      await updateExportJob(exportJobId, {
        status: ExportStatus.FAILED,
        errorMessage: `Failed after ${attempt} attempts. Last error: ${errorMessage}`,
      });
      return;
    }

    throw error;
  }
}
