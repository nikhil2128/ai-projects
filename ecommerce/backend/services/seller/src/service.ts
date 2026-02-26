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
} from "../../../shared/types";
import { withRetry } from "../../../shared/retry";
import { SellerStore } from "./store";

const MAX_BATCH_SIZE = 500;
const MAX_BULK_UPLOAD_ROWS = 200_000;
const BULK_CHUNK_SIZE = 1000;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const MAX_STORED_ERRORS = 1000;
const MAX_JOB_RETRIES = 3;
const DB_RETRY_OPTS = { maxRetries: 3, baseDelayMs: 500, maxDelayMs: 10_000 };

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

  private async createNotification(
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

  // ── Large batch upload pipeline ─────────────────────────────────

  async startBatchUpload(
    sellerId: string,
    csvData: string,
    fileName: string
  ): Promise<ServiceResult<{ jobId: string }>> {
    const lines = csvData.trim().split("\n");
    const dataRowCount = lines.length - 1;

    if (dataRowCount <= 0) {
      return { success: false, error: "CSV file is empty or has no data rows" };
    }

    if (dataRowCount > MAX_BULK_UPLOAD_ROWS) {
      return { success: false, error: `Maximum ${MAX_BULK_UPLOAD_ROWS.toLocaleString()} rows per upload` };
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    if (!headers.includes("name") || !headers.includes("price")) {
      return { success: false, error: "CSV must include 'name' and 'price' columns" };
    }

    const now = new Date();
    const job: BatchJob = {
      id: uuidv4(),
      sellerId,
      status: "pending",
      totalRows: dataRowCount,
      processedRows: 0,
      createdCount: 0,
      errorCount: 0,
      errors: [],
      fileName,
      retryCount: 0,
      maxRetries: MAX_JOB_RETRIES,
      failedAtRow: null,
      csvData: csvData,
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createBatchJob(job);

    this.processBatchInBackground(job.id, sellerId, csvData, 1).catch(() => {});

    return { success: true, data: { jobId: job.id } };
  }

  async retryBatchJob(
    sellerId: string,
    jobId: string
  ): Promise<ServiceResult<{ jobId: string }>> {
    const job = await this.store.getBatchJobWithCsv(jobId, sellerId);
    if (!job) {
      return { success: false, error: "Batch job not found" };
    }

    if (job.status !== "failed") {
      return { success: false, error: "Only failed jobs can be retried" };
    }

    if (job.retryCount >= job.maxRetries) {
      return { success: false, error: `Maximum retries (${job.maxRetries}) reached for this job` };
    }

    if (!job.csvData) {
      return { success: false, error: "CSV data is no longer available for this job. Please re-upload the file." };
    }

    const resumeFromRow = job.failedAtRow ?? 1;

    await this.store.updateBatchJob(jobId, {
      status: "pending",
      retryCount: job.retryCount + 1,
      errors: [],
    });

    this.processBatchInBackground(jobId, sellerId, job.csvData, resumeFromRow).catch(() => {});

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

  private async processBatchInBackground(
    jobId: string,
    sellerId: string,
    csvData: string,
    startFromRow: number
  ): Promise<void> {
    await this.store.updateBatchJob(jobId, { status: "processing" });

    try {
      const lines = csvData.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      const nameIdx = headers.indexOf("name");
      const descIdx = headers.indexOf("description");
      const priceIdx = headers.indexOf("price");
      const categoryIdx = headers.indexOf("category");
      const stockIdx = headers.indexOf("stock");
      const imageIdx = headers.indexOf("imageurl");

      let totalProcessed = startFromRow > 1 ? startFromRow - 1 : 0;
      let totalCreated = 0;
      let totalErrorCount = 0;
      const allErrors: { row: number; error: string }[] = [];

      const chunkStart = Math.max(1, startFromRow);

      for (let i = chunkStart; i < lines.length; i += BULK_CHUNK_SIZE) {
        const chunkEnd = Math.min(i + BULK_CHUNK_SIZE, lines.length);
        const validProducts: Product[] = [];
        const chunkErrors: { row: number; error: string }[] = [];

        for (let row = i; row < chunkEnd; row++) {
          const cols = this.parseCSVLine(lines[row]);
          if (cols.length === 0 || cols.every((c) => !c.trim())) {
            totalProcessed++;
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

          const validation = this.validateProduct(input);
          if (validation) {
            totalErrorCount++;
            if (allErrors.length < MAX_STORED_ERRORS) {
              chunkErrors.push({ row, error: validation });
            }
            totalProcessed++;
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
            sellerId,
            createdAt: new Date(),
          });

          totalProcessed++;
        }

        allErrors.push(...chunkErrors);

        if (validProducts.length > 0) {
          try {
            await withRetry(
              () => this.store.addProductsBulk(validProducts),
              {
                ...DB_RETRY_OPTS,
                onRetry: (err, attempt, delay) => {
                  console.warn(
                    `Batch job ${jobId}: DB insert retry ${attempt} in ${delay}ms — ${err instanceof Error ? err.message : err}`
                  );
                },
              }
            );
            totalCreated += validProducts.length;
          } catch (dbErr) {
            const errMsg = dbErr instanceof Error ? dbErr.message : "Database insert failed";
            totalErrorCount += validProducts.length;

            if (allErrors.length < MAX_STORED_ERRORS) {
              allErrors.push({
                row: i,
                error: `DB insert failed for chunk (rows ${i}-${chunkEnd - 1}): ${errMsg}`,
              });
            }

            await this.store.updateBatchJob(jobId, {
              status: "failed",
              processedRows: totalProcessed,
              createdCount: totalCreated,
              errorCount: totalErrorCount,
              errors: allErrors,
              failedAtRow: i,
            });

            await this.notifyBatchFailure(sellerId, jobId, errMsg, totalCreated, totalErrorCount);
            return;
          }
        }

        await withRetry(
          () =>
            this.store.updateBatchJob(jobId, {
              processedRows: totalProcessed,
              createdCount: totalCreated,
              errorCount: totalErrorCount,
              errors: allErrors,
            }),
          { maxRetries: 2, baseDelayMs: 200, maxDelayMs: 2_000 }
        );
      }

      await this.store.updateBatchJob(jobId, {
        status: "completed",
        processedRows: totalProcessed,
        createdCount: totalCreated,
        errorCount: totalErrorCount,
        errors: allErrors,
      });

      await this.store.clearBatchJobCsvData(jobId);

      if (totalErrorCount > 0) {
        await this.createNotification(
          sellerId,
          "batch_completed_with_errors",
          `CSV upload "${await this.getJobFileName(jobId, sellerId)}" completed with errors`,
          `${totalCreated.toLocaleString()} products created, ${totalErrorCount.toLocaleString()} rows had errors. Check the batch job details for specifics.`,
          { jobId, createdCount: totalCreated, errorCount: totalErrorCount }
        );
      } else {
        await this.createNotification(
          sellerId,
          "batch_completed",
          `CSV upload completed successfully`,
          `All ${totalCreated.toLocaleString()} products from your upload have been created.`,
          { jobId, createdCount: totalCreated }
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      await this.store.updateBatchJob(jobId, {
        status: "failed",
        errors: [{ row: 0, error: `Processing failed: ${errorMessage}` }],
        failedAtRow: 1,
      }).catch(() => {});

      await this.notifyBatchFailure(sellerId, jobId, errorMessage, 0, 0);
    }
  }

  private async notifyBatchFailure(
    sellerId: string,
    jobId: string,
    errorMessage: string,
    createdCount: number,
    errorCount: number
  ): Promise<void> {
    const fileName = await this.getJobFileName(jobId, sellerId);
    await this.createNotification(
      sellerId,
      "batch_failed",
      `CSV upload "${fileName}" failed`,
      `The upload encountered an error: ${errorMessage}. ${createdCount > 0 ? `${createdCount.toLocaleString()} products were created before the failure.` : "No products were created."} You can retry this job from the batch upload page.`,
      { jobId, errorMessage, createdCount, errorCount }
    );
  }

  private async getJobFileName(jobId: string, sellerId: string): Promise<string> {
    try {
      const job = await this.store.getBatchJob(jobId, sellerId);
      return job?.fileName ?? "unknown";
    } catch {
      return "unknown";
    }
  }

  private parseCSVLine(line: string): string[] {
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

  private validateProduct(input: ProductCreateInput): string | null {
    if (!input.name?.trim()) return "Product name is required";
    if (typeof input.price !== "number" || input.price <= 0) return "Price must be a positive number";
    if (typeof input.stock !== "number" || input.stock < 0) return "Stock cannot be negative";
    if (!input.category?.trim()) return "Category is required";
    if (!input.description?.trim()) return "Description is required";
    return null;
  }
}
