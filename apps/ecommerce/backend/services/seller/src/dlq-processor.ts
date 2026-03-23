import {
  receiveMessages,
  deleteMessage,
  parseMessageBody,
  CSV_DLQ_URL,
} from "../../../shared/sqs";
import type { CsvDlqMessage } from "../../../shared/types";
import { SellerService } from "./service";
import { SellerStore } from "./store";

const DLQ_POLL_INTERVAL_MS = 30_000; // poll less aggressively than main queue

/**
 * DLQ processor that handles permanently failed CSV chunk messages.
 *
 * SQS automatically routes messages to the DLQ after the maxReceiveCount
 * is exceeded on the source queue. This processor reads those messages,
 * logs the failures, updates job state, and notifies the seller.
 *
 * Infra-level retry (SQS visibility timeout + maxReceiveCount) handles
 * transient failures. Messages that land here are truly unprocessable.
 */
export class DlqProcessor {
  private running = false;

  constructor(
    private service: SellerService,
    private store: SellerStore
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    console.log("[DlqProcessor] Started polling DLQ");
    this.poll();
  }

  stop(): void {
    this.running = false;
    console.log("[DlqProcessor] Stopped");
  }

  private async poll(): Promise<void> {
    while (this.running) {
      try {
        const messages = await receiveMessages(CSV_DLQ_URL, 10, 20, 300);

        if (messages.length === 0) {
          await sleep(DLQ_POLL_INTERVAL_MS);
          continue;
        }

        for (const msg of messages) {
          try {
            await this.handleDlqMessage(msg);
            await deleteMessage(CSV_DLQ_URL, msg.ReceiptHandle!);
          } catch (err) {
            console.error("[DlqProcessor] Failed to process DLQ message:", err);
          }
        }
      } catch (err) {
        console.error("[DlqProcessor] Polling error:", err);
        await sleep(DLQ_POLL_INTERVAL_MS);
      }
    }
  }

  private async handleDlqMessage(sqsMessage: { Body?: string; ReceiptHandle?: string }): Promise<void> {
    const dlqMsg = parseMessageBody<CsvDlqMessage>(sqsMessage as { Body: string });

    const { originalMessage, error, receiveCount, failedAt } = dlqMsg;

    console.error(
      `[DlqProcessor] Permanently failed chunk — ` +
      `job=${originalMessage.jobId}, chunk=${originalMessage.chunkIndex + 1}/${originalMessage.totalChunks}, ` +
      `rows=${originalMessage.startRow}-${originalMessage.endRow}, ` +
      `receiveCount=${receiveCount}, error="${error}", failedAt=${failedAt}`
    );

    const rowCount = originalMessage.endRow - originalMessage.startRow + 1;

    await this.store.incrementJobCounters(
      originalMessage.jobId,
      rowCount,
      0,
      rowCount,
      [{
        row: originalMessage.startRow,
        error: `Chunk permanently failed after ${receiveCount} attempts: ${error}`,
      }]
    );

    const counts = await this.store.incrementChunkFailed(originalMessage.jobId);

    if (counts.chunksCompleted + counts.chunksFailed >= counts.totalChunks) {
      await this.service.finalizeBatchJob(originalMessage.jobId);
    }

    await this.service.createNotification(
      originalMessage.sellerId,
      "batch_failed",
      `CSV chunk failed permanently`,
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
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
