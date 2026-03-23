import { v4 as uuidv4 } from "uuid";
import {
  Product,
  ProductCreateInput,
  PaginatedResult,
  ServiceResult,
  SellerSale,
  SellerDashboardStats,
  BatchJob,
  SellerNotification,
  CsvFileUploadedMessage,
} from "../../../shared/types";
import { withRetry } from "../../../shared/retry";
import { generatePresignedUploadUrl, buildCsvKey, getObjectAsString, deleteObject } from "../../../shared/s3";
import { sendMessage, sendMessageBatch, CSV_QUEUE_URL } from "../../../shared/sqs";
import { SellerStore } from "./store";
import type { CsvChunkMessage } from "../../../shared/types";

const MAX_BATCH_SIZE = 500;
const MAX_BULK_UPLOAD_ROWS = 200_000;
const BULK_CHUNK_SIZE = 1000;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const MAX_JOB_RETRIES = 3;

export class SellerService {
  constructor(private store: SellerStore) {}

  async createProduct(
    sellerId: string,
    input: ProductCreateInput
  ): Promise<ServiceResult<Product>> {
    const validation = this.validateProduct(input);
    if (validation) return { success: false, error: validation };

    const product: Product = {
      id: uuidv4(),
      name: input.name.trim(),
      description: input.description,
      price: input.price,
      category: input.category,
      stock: input.stock,
      imageUrl: input.imageUrl ?? "",
      sellerId,
      createdAt: new Date(),
    };

    await this.store.addProduct(product);
    return { success: true, data: product };
  }

  async batchCreateProducts(
    sellerId: string,
    inputs: ProductCreateInput[]
  ): Promise<ServiceResult<{ created: number; errors: { index: number; error: string }[] }>> {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return { success: false, error: "Products array is required" };
    }

    if (inputs.length > MAX_BATCH_SIZE) {
      return { success: false, error: `Maximum ${MAX_BATCH_SIZE} products per batch` };
    }

    const valid: Product[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const validation = this.validateProduct(inputs[i]);
      if (validation) {
        errors.push({ index: i, error: validation });
        continue;
      }

      valid.push({
        id: uuidv4(),
        name: inputs[i].name.trim(),
        description: inputs[i].description,
        price: inputs[i].price,
        category: inputs[i].category,
        stock: inputs[i].stock,
        imageUrl: inputs[i].imageUrl ?? "",
        sellerId,
        createdAt: new Date(),
      });
    }

    if (valid.length > 0) {
      await this.store.addProducts(valid);
    }

    return { success: true, data: { created: valid.length, errors } };
  }

  async getProducts(
    sellerId: string,
    page = 1,
    limit = DEFAULT_PAGE_LIMIT
  ): Promise<ServiceResult<PaginatedResult<Product>>> {
    const safeLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, limit));
    const safePage = Math.max(1, page);

    const { data, total } = await this.store.getProductsBySeller(sellerId, safePage, safeLimit);
    const totalPages = Math.ceil(total / safeLimit);

    return {
      success: true,
      data: { data, total, page: safePage, limit: safeLimit, totalPages },
    };
  }

  async updateProduct(
    sellerId: string,
    productId: string,
    updates: Partial<ProductCreateInput>
  ): Promise<ServiceResult<Product>> {
    const product = await this.store.getProductByIdAndSeller(productId, sellerId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    if (updates.name !== undefined) {
      if (!updates.name.trim()) return { success: false, error: "Product name is required" };
      product.name = updates.name.trim();
    }
    if (updates.description !== undefined) product.description = updates.description;
    if (updates.price !== undefined) {
      if (updates.price <= 0) return { success: false, error: "Price must be positive" };
      product.price = updates.price;
    }
    if (updates.category !== undefined) product.category = updates.category;
    if (updates.stock !== undefined) {
      if (updates.stock < 0) return { success: false, error: "Stock cannot be negative" };
      product.stock = updates.stock;
    }
    if (updates.imageUrl !== undefined) product.imageUrl = updates.imageUrl;

    await this.store.updateProduct(product);
    return { success: true, data: product };
  }

  async deleteProduct(
    sellerId: string,
    productId: string
  ): Promise<ServiceResult<void>> {
    const deleted = await this.store.deleteProduct(productId, sellerId);
    if (!deleted) {
      return { success: false, error: "Product not found" };
    }
    return { success: true };
  }

  async getSales(
    sellerId: string,
    page = 1,
    limit = DEFAULT_PAGE_LIMIT
  ): Promise<ServiceResult<PaginatedResult<SellerSale>>> {
    const safeLimit = Math.min(MAX_PAGE_LIMIT, Math.max(1, limit));
    const safePage = Math.max(1, page);

    const { data, total } = await this.store.getSellerSales(sellerId, safePage, safeLimit);
    const totalPages = Math.ceil(total / safeLimit);

    return {
      success: true,
      data: { data, total, page: safePage, limit: safeLimit, totalPages },
    };
  }

  async getDashboard(sellerId: string): Promise<ServiceResult<SellerDashboardStats>> {
    const stats = await this.store.getSellerStats(sellerId);
    const { data: recentSales } = await this.store.getSellerSales(sellerId, 1, 5);

    return {
      success: true,
      data: {
        ...stats,
        recentSales,
      },
    };
  }

  // ── Notifications ────────────────────────────────────────────────

  async getNotifications(sellerId: string): Promise<ServiceResult<SellerNotification[]>> {
    const notifications = await this.store.getNotifications(sellerId);
    return { success: true, data: notifications };
  }

  async getUnreadCount(sellerId: string): Promise<ServiceResult<{ count: number }>> {
    const count = await this.store.getUnreadNotificationCount(sellerId);
    return { success: true, data: { count } };
  }

  async markNotificationRead(sellerId: string, notificationId: string): Promise<ServiceResult<void>> {
    const ok = await this.store.markNotificationRead(notificationId, sellerId);
    if (!ok) return { success: false, error: "Notification not found" };
    return { success: true };
  }

  async markAllNotificationsRead(sellerId: string): Promise<ServiceResult<void>> {
    await this.store.markAllNotificationsRead(sellerId);
    return { success: true };
  }

  async createNotification(
    sellerId: string,
    type: SellerNotification["type"],
    title: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const notification: SellerNotification = {
        id: uuidv4(),
        sellerId,
        type,
        title,
        message,
        metadata,
        read: false,
        createdAt: new Date(),
      };
      await this.store.createNotification(notification);
    } catch (err) {
      console.error("Failed to create notification:", err);
    }
  }

  // ── S3 presigned URL for CSV upload ──────────────────────────────

  async getUploadUrl(
    sellerId: string,
    fileName: string
  ): Promise<ServiceResult<{ uploadUrl: string; s3Key: string; jobId: string }>> {
    const jobId = uuidv4();
    const s3Key = buildCsvKey(sellerId, jobId, fileName);
    const { url } = await generatePresignedUploadUrl(s3Key);

    return {
      success: true,
      data: { uploadUrl: url, s3Key, jobId },
    };
  }

  // ── Large batch upload via SQS pipeline ──────────────────────────

  async startBatchUpload(
    sellerId: string,
    jobId: string,
    s3Key: string,
    fileName: string,
    totalRows: number
  ): Promise<ServiceResult<{ jobId: string }>> {
    if (totalRows <= 0) {
      return { success: false, error: "CSV file is empty or has no data rows" };
    }

    if (totalRows > MAX_BULK_UPLOAD_ROWS) {
      return { success: false, error: `Maximum ${MAX_BULK_UPLOAD_ROWS.toLocaleString()} rows per upload` };
    }

    const now = new Date();
    const job: BatchJob = {
      id: jobId,
      sellerId,
      status: "pending",
      totalRows,
      processedRows: 0,
      createdCount: 0,
      errorCount: 0,
      errors: [],
      fileName,
      retryCount: 0,
      maxRetries: MAX_JOB_RETRIES,
      failedAtRow: null,
      csvData: null,
      s3Key,
      totalChunks: 0,
      chunksCompleted: 0,
      chunksFailed: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createBatchJob(job);

    const message: CsvFileUploadedMessage = {
      type: "csv_file_uploaded",
      jobId,
      sellerId,
      s3Key,
      fileName,
      totalRows,
    };

    await sendMessage(CSV_QUEUE_URL, message);

    return { success: true, data: { jobId } };
  }

  /**
   * Called by the file-level SQS worker after the CSV file is read from S3.
   * Splits the CSV into chunks and dispatches chunk messages to SQS.
   */
  async splitAndEnqueueChunks(
    jobId: string,
    sellerId: string,
    s3Key: string
  ): Promise<void> {
    await this.store.updateBatchJob(jobId, { status: "processing" });

    const csvData = await getObjectAsString(s3Key);
    const lines = csvData.trim().split("\n");

    if (lines.length < 2) {
      await this.store.updateBatchJob(jobId, {
        status: "failed",
        errors: [{ row: 0, error: "CSV file is empty or has no data rows" }],
      });
      return;
    }

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

    if (!headers.includes("name") || !headers.includes("price")) {
      await this.store.updateBatchJob(jobId, {
        status: "failed",
        errors: [{ row: 0, error: "CSV must include 'name' and 'price' columns" }],
      });
      return;
    }

    const dataLines = lines.slice(1);
    const totalDataRows = dataLines.length;
    const chunkMessages: CsvChunkMessage[] = [];

    for (let i = 0; i < totalDataRows; i += BULK_CHUNK_SIZE) {
      const chunkRows = dataLines.slice(i, i + BULK_CHUNK_SIZE);
      const chunkIndex = Math.floor(i / BULK_CHUNK_SIZE);

      chunkMessages.push({
        type: "csv_chunk",
        jobId,
        sellerId,
        s3Key,
        chunkIndex,
        totalChunks: 0, // will be set below
        startRow: i + 1,
        endRow: i + chunkRows.length,
        headerLine,
        rows: chunkRows,
      });
    }

    const totalChunks = chunkMessages.length;
    for (const msg of chunkMessages) {
      msg.totalChunks = totalChunks;
    }

    await this.store.updateBatchJob(jobId, {
      totalChunks,
      totalRows: totalDataRows,
    });

    await withRetry(
      () => sendMessageBatch(CSV_QUEUE_URL, chunkMessages),
      { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 5000 }
    );
  }

  async retryBatchJob(
    sellerId: string,
    jobId: string
  ): Promise<ServiceResult<{ jobId: string }>> {
    const job = await this.store.getBatchJob(jobId, sellerId);
    if (!job) {
      return { success: false, error: "Batch job not found" };
    }

    if (job.status !== "failed") {
      return { success: false, error: "Only failed jobs can be retried" };
    }

    if (job.retryCount >= job.maxRetries) {
      return { success: false, error: `Maximum retries (${job.maxRetries}) reached for this job` };
    }

    if (!job.s3Key) {
      return { success: false, error: "S3 file reference is no longer available. Please re-upload the file." };
    }

    await this.store.updateBatchJob(jobId, {
      status: "pending",
      retryCount: job.retryCount + 1,
      processedRows: 0,
      createdCount: 0,
      errorCount: 0,
      errors: [],
      chunksCompleted: 0,
      chunksFailed: 0,
      totalChunks: 0,
    });

    const message: CsvFileUploadedMessage = {
      type: "csv_file_uploaded",
      jobId,
      sellerId,
      s3Key: job.s3Key,
      fileName: job.fileName,
      totalRows: job.totalRows,
    };

    await sendMessage(CSV_QUEUE_URL, message);

    return { success: true, data: { jobId } };
  }

  async getBatchJobStatus(
    sellerId: string,
    jobId: string
  ): Promise<ServiceResult<BatchJob>> {
    const job = await this.store.getBatchJob(jobId, sellerId);
    if (!job) return { success: false, error: "Batch job not found" };
    return { success: true, data: job };
  }

  async getRecentBatchJobs(
    sellerId: string
  ): Promise<ServiceResult<BatchJob[]>> {
    const jobs = await this.store.getRecentBatchJobs(sellerId);
    return { success: true, data: jobs };
  }

  /**
   * Finalizes a batch job after all chunks are done (called by the chunk worker).
   */
  async finalizeBatchJob(jobId: string): Promise<void> {
    const job = await this.store.getBatchJobById(jobId);
    if (!job) return;

    const allDone = job.chunksCompleted + job.chunksFailed >= job.totalChunks;
    if (!allDone) return;

    const finalStatus = job.chunksFailed > 0 ? "completed" : "completed";
    const hasErrors = job.errorCount > 0 || job.chunksFailed > 0;

    await this.store.updateBatchJob(jobId, {
      status: job.chunksFailed > 0 && job.createdCount === 0 ? "failed" : finalStatus,
    });

    if (job.s3Key) {
      try {
        await deleteObject(job.s3Key);
      } catch {
        console.warn(`Failed to clean up S3 object ${job.s3Key}`);
      }
    }

    if (hasErrors) {
      await this.createNotification(
        job.sellerId,
        "batch_completed_with_errors",
        `CSV upload "${job.fileName}" completed with errors`,
        `${job.createdCount.toLocaleString()} products created, ${job.errorCount.toLocaleString()} rows had errors. ${job.chunksFailed} chunk(s) failed.`,
        { jobId, createdCount: job.createdCount, errorCount: job.errorCount, chunksFailed: job.chunksFailed }
      );
    } else {
      await this.createNotification(
        job.sellerId,
        "batch_completed",
        "CSV upload completed successfully",
        `All ${job.createdCount.toLocaleString()} products from your upload have been created.`,
        { jobId, createdCount: job.createdCount }
      );
    }
  }

  parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  validateProduct(input: ProductCreateInput): string | null {
    if (!input.name?.trim()) return "Product name is required";
    if (typeof input.price !== "number" || input.price <= 0) return "Price must be a positive number";
    if (typeof input.stock !== "number" || input.stock < 0) return "Stock cannot be negative";
    if (!input.category?.trim()) return "Category is required";
    if (!input.description?.trim()) return "Description is required";
    return null;
  }
}
