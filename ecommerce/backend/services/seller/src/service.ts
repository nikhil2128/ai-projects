import { v4 as uuidv4 } from "uuid";
import {
  Product,
  ProductCreateInput,
  PaginatedResult,
  ServiceResult,
  SellerSale,
  SellerDashboardStats,
  BatchJob,
} from "../../../shared/types";
import { SellerStore } from "./store";

const MAX_BATCH_SIZE = 500;
const MAX_BULK_UPLOAD_ROWS = 200_000;
const BULK_CHUNK_SIZE = 1000;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

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
      createdAt: now,
      updatedAt: now,
    };

    await this.store.createBatchJob(job);

    this.processBatchInBackground(job.id, sellerId, csvData).catch(() => {});

    return { success: true, data: { jobId: job.id } };
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
    csvData: string
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

      let totalProcessed = 0;
      let totalCreated = 0;
      let totalErrorCount = 0;
      const allErrors: { row: number; error: string }[] = [];
      const MAX_STORED_ERRORS = 1000;

      for (let chunkStart = 1; chunkStart < lines.length; chunkStart += BULK_CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + BULK_CHUNK_SIZE, lines.length);
        const validProducts: Product[] = [];

        for (let i = chunkStart; i < chunkEnd; i++) {
          const cols = this.parseCSVLine(lines[i]);
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
              allErrors.push({ row: i, error: validation });
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

        if (validProducts.length > 0) {
          await this.store.addProductsBulk(validProducts);
          totalCreated += validProducts.length;
        }

        await this.store.updateBatchJob(jobId, {
          processedRows: totalProcessed,
          createdCount: totalCreated,
          errorCount: totalErrorCount,
          errors: allErrors,
        });
      }

      await this.store.updateBatchJob(jobId, {
        status: "completed",
        processedRows: totalProcessed,
        createdCount: totalCreated,
        errorCount: totalErrorCount,
        errors: allErrors,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await this.store.updateBatchJob(jobId, {
        status: "failed",
        errors: [{ row: 0, error: `Processing failed: ${errorMessage}` }],
      });
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
