import { createPool } from "../shared/database";
import { SellerService } from "../services/seller/src/service";
import { SellerStore } from "../services/seller/src/store";
import type { SQSEvent } from "aws-lambda";
import type { CsvDlqMessage } from "../shared/types";
import { Pool } from "pg";

let pool: Pool;
let store: SellerStore;
let service: SellerService;

function init() {
  if (!pool) {
    pool = createPool({ max: 1, idleTimeoutMillis: 120_000 });
    store = new SellerStore(pool);
    service = new SellerService(store);
  }
}

export async function lambdaHandler(event: SQSEvent): Promise<void> {
  init();

  for (const record of event.Records) {
    try {
      await handleDlqMessage(record.body);
    } catch (err) {
      console.error("Failed to process DLQ message:", err);
    }
  }
}

async function handleDlqMessage(body: string): Promise<void> {
  const dlqMsg: CsvDlqMessage = JSON.parse(body);
  const { originalMessage, error, receiveCount, failedAt } = dlqMsg;

  console.error(
    `Permanently failed chunk — ` +
      `job=${originalMessage.jobId}, chunk=${originalMessage.chunkIndex + 1}/${originalMessage.totalChunks}, ` +
      `rows=${originalMessage.startRow}-${originalMessage.endRow}, ` +
      `receiveCount=${receiveCount}, error="${error}", failedAt=${failedAt}`
  );

  const rowCount = originalMessage.endRow - originalMessage.startRow + 1;

  await store.incrementJobCounters(originalMessage.jobId, rowCount, 0, rowCount, [
    {
      row: originalMessage.startRow,
      error: `Chunk permanently failed after ${receiveCount} attempts: ${error}`,
    },
  ]);

  const counts = await store.incrementChunkFailed(originalMessage.jobId);

  if (counts.chunksCompleted + counts.chunksFailed >= counts.totalChunks) {
    await service.finalizeBatchJob(originalMessage.jobId);
  }

  await service.createNotification(
    originalMessage.sellerId,
    "batch_failed",
    "CSV chunk failed permanently",
    `Rows ${originalMessage.startRow}-${originalMessage.endRow} could not be processed after ${receiveCount} attempts. Error: ${error}`,
    {
      jobId: originalMessage.jobId,
      chunkIndex: originalMessage.chunkIndex,
      startRow: originalMessage.startRow,
      endRow: originalMessage.endRow,
      error,
      receiveCount,
    }
  );
}
