import { v4 as uuidv4 } from "uuid";
import { createPool } from "../shared/database";
import { withRetry } from "../shared/retry";
import { SellerService } from "../services/seller/src/service";
import { SellerStore } from "../services/seller/src/store";
import type { SQSEvent, SQSRecord } from "aws-lambda";
import type {
  CsvFileUploadedMessage,
  CsvChunkMessage,
  CsvDlqMessage,
  ProductCreateInput,
  Product,
} from "../shared/types";
import { sendMessage, CSV_DLQ_URL } from "../shared/sqs";
import { Pool } from "pg";

const MAX_STORED_ERRORS_PER_CHUNK = 50;
const DB_RETRY_OPTS = { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 10_000 };

let pool: Pool;
let store: SellerStore;
let service: SellerService;

function init() {
  if (!pool) {
    pool = createPool({ max: 2, idleTimeoutMillis: 120_000 });
    store = new SellerStore(pool);
    service = new SellerService(store);
  }
}

export async function lambdaHandler(event: SQSEvent): Promise<{ batchItemFailures: { itemIdentifier: string }[] }> {
  init();

  const failures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (err) {
      console.error(`Failed to process message ${record.messageId}:`, err);
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
}

async function processRecord(record: SQSRecord): Promise<void> {
  const body = JSON.parse(record.body) as CsvFileUploadedMessage | CsvChunkMessage;
  const receiveCount = parseInt(record.attributes.ApproximateReceiveCount ?? "1", 10);

  if (receiveCount > 3) {
    console.warn(`Message exceeded max receives (${receiveCount}), sending to DLQ`);
    if (body.type === "csv_chunk") {
      await sendToDlq(body as CsvChunkMessage, "Max receive count exceeded", receiveCount);
    }
    return;
  }

  if (body.type === "csv_file_uploaded") {
    await handleFileUploaded(body as CsvFileUploadedMessage);
  } else if (body.type === "csv_chunk") {
    await handleChunk(body as CsvChunkMessage);
  } else {
    console.warn("Unknown message type, skipping");
  }
}

async function handleFileUploaded(msg: CsvFileUploadedMessage): Promise<void> {
  console.log(`Processing file upload: job=${msg.jobId}, file=${msg.fileName}`);

  try {
    await service.splitAndEnqueueChunks(msg.jobId, msg.sellerId, msg.s3Key);
    console.log(`Chunks enqueued for job ${msg.jobId}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`Failed to split file for job ${msg.jobId}: ${errMsg}`);

    await store.updateBatchJob(msg.jobId, {
      status: "failed",
      errors: [{ row: 0, error: `File processing failed: ${errMsg}` }],
    });

    await service.createNotification(
      msg.sellerId,
      "batch_failed",
      `CSV upload "${msg.fileName}" failed`,
      `Failed to process the uploaded file: ${errMsg}. You can retry from the batch upload page.`,
      { jobId: msg.jobId, errorMessage: errMsg }
    );
  }
}

async function handleChunk(msg: CsvChunkMessage): Promise<void> {
  console.log(`Processing chunk ${msg.chunkIndex + 1}/${msg.totalChunks} for job ${msg.jobId}`);

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
    const cols = service.parseCSVLine(msg.rows[i]);

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

    const validation = service.validateProduct(input);
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
      await withRetry(() => store.addProductsBulk(validProducts), {
        ...DB_RETRY_OPTS,
        onRetry: (err, attempt, delay) => {
          console.warn(
            `Job ${msg.jobId} chunk ${msg.chunkIndex}: DB retry ${attempt} in ${delay}ms — ${err instanceof Error ? err.message : err}`
          );
        },
      });
      createdCount = validProducts.length;
    } catch (dbErr) {
      const errMsg = dbErr instanceof Error ? dbErr.message : "Database insert failed";
      chunkErrors.push({
        row: msg.startRow,
        error: `DB insert failed for chunk (rows ${msg.startRow}-${msg.endRow}): ${errMsg}`,
      });

      await store.incrementJobCounters(
        msg.jobId,
        processedCount,
        0,
        validProducts.length + chunkErrors.length - 1,
        chunkErrors
      );

      const counts = await store.incrementChunkFailed(msg.jobId);
      if (counts.chunksCompleted + counts.chunksFailed >= counts.totalChunks) {
        await service.finalizeBatchJob(msg.jobId);
      }

      throw dbErr;
    }
  }

  await store.incrementJobCounters(msg.jobId, processedCount, createdCount, chunkErrors.length, chunkErrors);

  const counts = await store.incrementChunkCompleted(msg.jobId);

  console.log(
    `Chunk ${msg.chunkIndex + 1}/${msg.totalChunks} done for job ${msg.jobId}: ` +
      `created=${createdCount}, errors=${chunkErrors.length}, progress=${counts.chunksCompleted}/${counts.totalChunks}`
  );

  if (counts.chunksCompleted + counts.chunksFailed >= counts.totalChunks) {
    await service.finalizeBatchJob(msg.jobId);
  }
}

async function sendToDlq(
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
      await store.incrementChunkFailed(originalMessage.jobId);
    }
  } catch (err) {
    console.error("Failed to send message to DLQ:", err);
  }
}
