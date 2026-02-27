import { v4 as uuidv4 } from "uuid";
import {
  receiveMessages,
  deleteMessage,
  parseMessageBody,
  getReceiveCount,
  sendMessage,
  CSV_QUEUE_URL,
  CSV_DLQ_URL,
} from "../../../shared/sqs";
import { withRetry } from "../../../shared/retry";
import type {
  CsvFileUploadedMessage,
  CsvChunkMessage,
  CsvDlqMessage,
  Product,
  ProductCreateInput,
} from "../../../shared/types";
import { SellerService } from "./service";
import { SellerStore } from "./store";

const MAX_RECEIVE_COUNT = 3;
const POLL_INTERVAL_MS = 1000;
const MAX_STORED_ERRORS_PER_CHUNK = 50;
const DB_RETRY_OPTS = { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 10_000 };

export class CsvWorker {
  private running = false;

  constructor(
    private service: SellerService,
    private store: SellerStore
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    console.log("[CsvWorker] Started polling SQS queue");
    this.poll();
  }

  stop(): void {
    this.running = false;
    console.log("[CsvWorker] Stopped");
  }

  private async poll(): Promise<void> {
    while (this.running) {
      try {
        const messages = await receiveMessages(CSV_QUEUE_URL, 10, 20, 120);

        if (messages.length === 0) continue;

        const tasks = messages.map(async (msg) => {
          try {
            const body = parseMessageBody<CsvFileUploadedMessage | CsvChunkMessage>(msg);
            const receiveCount = getReceiveCount(msg);

            if (receiveCount > MAX_RECEIVE_COUNT) {
              console.warn(`[CsvWorker] Message exceeded max receives (${receiveCount}), sending to DLQ`);
              await this.sendToDlq(body as CsvChunkMessage, "Max receive count exceeded", receiveCount);
              await deleteMessage(CSV_QUEUE_URL, msg.ReceiptHandle!);
              return;
            }

            if (body.type === "csv_file_uploaded") {
              await this.handleFileUploaded(body as CsvFileUploadedMessage);
            } else if (body.type === "csv_chunk") {
              await this.handleChunk(body as CsvChunkMessage);
            } else {
              console.warn("[CsvWorker] Unknown message type, skipping");
            }

            await deleteMessage(CSV_QUEUE_URL, msg.ReceiptHandle!);
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Unknown error";
            console.error(`[CsvWorker] Failed to process message: ${errMsg}`);
          }
        });

        await Promise.allSettled(tasks);
      } catch (err) {
        console.error("[CsvWorker] Polling error:", err);
        await sleep(POLL_INTERVAL_MS);
      }
    }
  }

  private async handleFileUploaded(msg: CsvFileUploadedMessage): Promise<void> {
    console.log(`[CsvWorker] Processing file upload: job=${msg.jobId}, file=${msg.fileName}`);

    try {
      await this.service.splitAndEnqueueChunks(msg.jobId, msg.sellerId, msg.s3Key);
      console.log(`[CsvWorker] Chunks enqueued for job ${msg.jobId}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[CsvWorker] Failed to split file for job ${msg.jobId}: ${errMsg}`);

      await this.store.updateBatchJob(msg.jobId, {
        status: "failed",
        errors: [{ row: 0, error: `File processing failed: ${errMsg}` }],
      });

      await this.service.createNotification(
        msg.sellerId,
        "batch_failed",
        `CSV upload "${msg.fileName}" failed`,
        `Failed to process the uploaded file: ${errMsg}. You can retry from the batch upload page.`,
        { jobId: msg.jobId, errorMessage: errMsg }
      );
    }
  }

  private async handleChunk(msg: CsvChunkMessage): Promise<void> {
    console.log(`[CsvWorker] Processing chunk ${msg.chunkIndex + 1}/${msg.totalChunks} for job ${msg.jobId}`);

    const headers = msg.headerLine.split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const descIdx = headers.indexOf("description");
    const priceIdx = headers.indexOf("price");
    const categoryIdx = headers.indexOf("category");
    const stockIdx = headers.indexOf("stock");
    const imageIdx = headers.indexOf("imageurl");

    const validProducts: Product[] = [];
    const chunkErrors: { row: number; error: string }[] = [];
    let processedCount = 0;

    for (let i = 0; i < msg.rows.length; i++) {
      const rowNum = msg.startRow + i;
      const cols = this.service.parseCSVLine(msg.rows[i]);

      if (cols.length === 0 || cols.every((c) => !c.trim())) {
        processedCount++;
        continue;
      }

      const input: ProductCreateInput = {
        name: cols[nameIdx]?.trim() ?? "",
        description: cols[descIdx]?.trim() ?? "",
        price: Number(cols[priceIdx]?.trim() ?? 0),
        category: cols[categoryIdx]?.trim() ?? "",
        stock: Number(cols[stockIdx]?.trim() ?? 0),
        imageUrl: cols[imageIdx]?.trim(),
      };

      const validation = this.service.validateProduct(input);
      if (validation) {
        if (chunkErrors.length < MAX_STORED_ERRORS_PER_CHUNK) {
          chunkErrors.push({ row: rowNum, error: validation });
        }
        processedCount++;
        continue;
      }

      validProducts.push({
        id: uuidv4(),
        name: input.name.trim(),
        description: input.description,
        price: input.price,
        category: input.category,
        stock: input.stock,
        imageUrl: input.imageUrl ?? "",
        sellerId: msg.sellerId,
        createdAt: new Date(),
      });

      processedCount++;
    }

    let createdCount = 0;

    if (validProducts.length > 0) {
      try {
        await withRetry(
          () => this.store.addProductsBulk(validProducts),
          {
            ...DB_RETRY_OPTS,
            onRetry: (err, attempt, delay) => {
              console.warn(
                `[CsvWorker] Job ${msg.jobId} chunk ${msg.chunkIndex}: DB retry ${attempt} in ${delay}ms — ${err instanceof Error ? err.message : err}`
              );
            },
          }
        );
        createdCount = validProducts.length;
      } catch (dbErr) {
        const errMsg = dbErr instanceof Error ? dbErr.message : "Database insert failed";
        chunkErrors.push({
          row: msg.startRow,
          error: `DB insert failed for chunk (rows ${msg.startRow}-${msg.endRow}): ${errMsg}`,
        });

        await this.store.incrementJobCounters(
          msg.jobId,
          processedCount,
          0,
          validProducts.length + chunkErrors.length - 1,
          chunkErrors
        );

        const counts = await this.store.incrementChunkFailed(msg.jobId);
        if (counts.chunksCompleted + counts.chunksFailed >= counts.totalChunks) {
          await this.service.finalizeBatchJob(msg.jobId);
        }

        throw dbErr;
      }
    }

    await this.store.incrementJobCounters(
      msg.jobId,
      processedCount,
      createdCount,
      chunkErrors.length,
      chunkErrors
    );

    const counts = await this.store.incrementChunkCompleted(msg.jobId);

    console.log(
      `[CsvWorker] Chunk ${msg.chunkIndex + 1}/${msg.totalChunks} done for job ${msg.jobId}: ` +
      `created=${createdCount}, errors=${chunkErrors.length}, progress=${counts.chunksCompleted}/${counts.totalChunks}`
    );

    if (counts.chunksCompleted + counts.chunksFailed >= counts.totalChunks) {
      await this.service.finalizeBatchJob(msg.jobId);
    }
  }

  private async sendToDlq(
    originalMessage: CsvChunkMessage,
    error: string,
    receiveCount: number
  ): Promise<void> {
    const dlqMessage: CsvDlqMessage = {
      originalMessage,
      error,
      receiveCount,
      failedAt: new Date().toISOString(),
    };

    try {
      await sendMessage(CSV_DLQ_URL, dlqMessage);

      if (originalMessage.jobId) {
        await this.store.incrementChunkFailed(originalMessage.jobId);
      }
    } catch (err) {
      console.error("[CsvWorker] Failed to send message to DLQ:", err);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
