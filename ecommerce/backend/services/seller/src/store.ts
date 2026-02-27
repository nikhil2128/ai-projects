import { Pool } from "pg";
import { Product, SellerSale, OrderStatus, BatchJob, BatchJobStatus, SellerNotification } from "../../../shared/types";

export class SellerStore {
  constructor(private pool: Pool) {}

  async addProduct(product: Product): Promise<void> {
    await this.pool.query(
      `INSERT INTO products (id, name, description, price, category, stock, image_url, seller_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        product.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.stock,
        product.imageUrl,
        product.sellerId,
        product.createdAt,
      ]
    );
  }

  async addProducts(products: Product[]): Promise<void> {
    if (products.length === 0) return;
    await this.addProductsBulk(products);
  }

  async addProductsBulk(products: Product[]): Promise<void> {
    if (products.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const CHUNK = 1000;
      for (let offset = 0; offset < products.length; offset += CHUNK) {
        const chunk = products.slice(offset, offset + CHUNK);
        const values: unknown[] = [];
        const placeholders: string[] = [];

        for (let i = 0; i < chunk.length; i++) {
          const base = i * 9;
          placeholders.push(
            `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`
          );
          const p = chunk[i];
          values.push(p.id, p.name, p.description, p.price, p.category, p.stock, p.imageUrl, p.sellerId, p.createdAt);
        }

        await client.query(
          `INSERT INTO products (id, name, description, price, category, stock, image_url, seller_id, created_at)
           VALUES ${placeholders.join(",")}`,
          values
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getProductsBySeller(sellerId: string, page: number, limit: number): Promise<{ data: Product[]; total: number }> {
    const countResult = await this.pool.query(
      "SELECT COUNT(*) FROM products WHERE seller_id = $1",
      [sellerId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const { rows } = await this.pool.query(
      "SELECT * FROM products WHERE seller_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [sellerId, limit, offset]
    );

    return { data: rows.map((r) => this.toProduct(r)), total };
  }

  async getProductByIdAndSeller(productId: string, sellerId: string): Promise<Product | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM products WHERE id = $1 AND seller_id = $2",
      [productId, sellerId]
    );
    return rows[0] ? this.toProduct(rows[0]) : undefined;
  }

  async updateProduct(product: Product): Promise<void> {
    await this.pool.query(
      `UPDATE products
       SET name = $2, description = $3, price = $4, category = $5,
           stock = $6, image_url = $7
       WHERE id = $1 AND seller_id = $8`,
      [
        product.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.stock,
        product.imageUrl,
        product.sellerId,
      ]
    );
  }

  async deleteProduct(productId: string, sellerId: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM products WHERE id = $1 AND seller_id = $2",
      [productId, sellerId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getSellerSales(sellerId: string, page: number, limit: number): Promise<{ data: SellerSale[]; total: number }> {
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = $1`,
      [sellerId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const { rows } = await this.pool.query(
      `SELECT oi.order_id, oi.product_id, oi.product_name, oi.quantity, oi.price,
              (oi.price * oi.quantity) as total,
              o.status as order_status, o.user_id as buyer_id, o.created_at
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE p.seller_id = $1
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset]
    );

    return { data: rows.map((r) => this.toSellerSale(r)), total };
  }

  async getSellerStats(sellerId: string): Promise<{
    totalProducts: number;
    totalSales: number;
    totalRevenue: number;
    topProducts: { productId: string; productName: string; totalSold: number; revenue: number }[];
  }> {
    const productCount = await this.pool.query(
      "SELECT COUNT(*) FROM products WHERE seller_id = $1",
      [sellerId]
    );

    const salesStats = await this.pool.query(
      `SELECT COALESCE(COUNT(*), 0) as total_sales,
              COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE p.seller_id = $1 AND o.status != 'cancelled'`,
      [sellerId]
    );

    const topProducts = await this.pool.query(
      `SELECT oi.product_id, oi.product_name,
              SUM(oi.quantity) as total_sold,
              SUM(oi.price * oi.quantity) as revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN orders o ON o.id = oi.order_id
       WHERE p.seller_id = $1 AND o.status != 'cancelled'
       GROUP BY oi.product_id, oi.product_name
       ORDER BY revenue DESC
       LIMIT 10`,
      [sellerId]
    );

    return {
      totalProducts: parseInt(productCount.rows[0].count, 10),
      totalSales: parseInt(salesStats.rows[0].total_sales, 10),
      totalRevenue: parseFloat(salesStats.rows[0].total_revenue),
      topProducts: topProducts.rows.map((r) => ({
        productId: r.product_id,
        productName: r.product_name,
        totalSold: parseInt(r.total_sold, 10),
        revenue: parseFloat(r.revenue),
      })),
    };
  }

  private toProduct(row: Record<string, unknown>): Product {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      price: Number(row.price),
      category: row.category as string,
      stock: row.stock as number,
      imageUrl: row.image_url as string,
      sellerId: row.seller_id as string | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }

  // ── Batch job operations ────────────────────────────────────────

  async createBatchJob(job: BatchJob): Promise<void> {
    await this.pool.query(
      `INSERT INTO batch_jobs (id, seller_id, status, total_rows, processed_rows, created_count,
        error_count, errors, file_name, retry_count, max_retries, failed_at_row, csv_data,
        s3_key, total_chunks, chunks_completed, chunks_failed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        job.id, job.sellerId, job.status, job.totalRows, job.processedRows, job.createdCount,
        job.errorCount, JSON.stringify(job.errors), job.fileName,
        job.retryCount, job.maxRetries, job.failedAtRow, job.csvData,
        job.s3Key, job.totalChunks, job.chunksCompleted, job.chunksFailed,
        job.createdAt, job.updatedAt,
      ]
    );
  }

  async updateBatchJob(
    id: string,
    updates: Partial<Pick<BatchJob,
      "status" | "processedRows" | "createdCount" | "errorCount" | "errors" |
      "retryCount" | "failedAtRow" | "csvData" | "s3Key" | "totalChunks" |
      "chunksCompleted" | "chunksFailed" | "totalRows"
    >>
  ): Promise<void> {
    const sets: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.status !== undefined) { sets.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.processedRows !== undefined) { sets.push(`processed_rows = $${idx++}`); values.push(updates.processedRows); }
    if (updates.createdCount !== undefined) { sets.push(`created_count = $${idx++}`); values.push(updates.createdCount); }
    if (updates.errorCount !== undefined) { sets.push(`error_count = $${idx++}`); values.push(updates.errorCount); }
    if (updates.errors !== undefined) { sets.push(`errors = $${idx++}`); values.push(JSON.stringify(updates.errors)); }
    if (updates.retryCount !== undefined) { sets.push(`retry_count = $${idx++}`); values.push(updates.retryCount); }
    if (updates.failedAtRow !== undefined) { sets.push(`failed_at_row = $${idx++}`); values.push(updates.failedAtRow); }
    if (updates.csvData !== undefined) { sets.push(`csv_data = $${idx++}`); values.push(updates.csvData); }
    if (updates.s3Key !== undefined) { sets.push(`s3_key = $${idx++}`); values.push(updates.s3Key); }
    if (updates.totalChunks !== undefined) { sets.push(`total_chunks = $${idx++}`); values.push(updates.totalChunks); }
    if (updates.chunksCompleted !== undefined) { sets.push(`chunks_completed = $${idx++}`); values.push(updates.chunksCompleted); }
    if (updates.chunksFailed !== undefined) { sets.push(`chunks_failed = $${idx++}`); values.push(updates.chunksFailed); }
    if (updates.totalRows !== undefined) { sets.push(`total_rows = $${idx++}`); values.push(updates.totalRows); }

    values.push(id);
    await this.pool.query(`UPDATE batch_jobs SET ${sets.join(", ")} WHERE id = $${idx}`, values);
  }

  async clearBatchJobCsvData(id: string): Promise<void> {
    await this.pool.query("UPDATE batch_jobs SET csv_data = NULL, updated_at = NOW() WHERE id = $1", [id]);
  }

  async getBatchJob(id: string, sellerId: string): Promise<BatchJob | undefined> {
    const { rows } = await this.pool.query(
      `SELECT id, seller_id, status, total_rows, processed_rows, created_count, error_count, errors,
              file_name, retry_count, max_retries, failed_at_row, s3_key,
              total_chunks, chunks_completed, chunks_failed, created_at, updated_at
       FROM batch_jobs WHERE id = $1 AND seller_id = $2`,
      [id, sellerId]
    );
    return rows[0] ? this.toBatchJob(rows[0]) : undefined;
  }

  async getBatchJobWithCsv(id: string, sellerId: string): Promise<BatchJob | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM batch_jobs WHERE id = $1 AND seller_id = $2",
      [id, sellerId]
    );
    return rows[0] ? this.toBatchJob(rows[0]) : undefined;
  }

  async getRecentBatchJobs(sellerId: string, limit = 20): Promise<BatchJob[]> {
    const { rows } = await this.pool.query(
      `SELECT id, seller_id, status, total_rows, processed_rows, created_count, error_count, errors,
              file_name, retry_count, max_retries, failed_at_row, s3_key,
              total_chunks, chunks_completed, chunks_failed, created_at, updated_at
       FROM batch_jobs WHERE seller_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [sellerId, limit]
    );
    return rows.map((r) => this.toBatchJob(r));
  }

  async incrementChunkCompleted(jobId: string): Promise<{ chunksCompleted: number; chunksFailed: number; totalChunks: number }> {
    const { rows } = await this.pool.query(
      `UPDATE batch_jobs
       SET chunks_completed = chunks_completed + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING chunks_completed, chunks_failed, total_chunks`,
      [jobId]
    );
    return {
      chunksCompleted: rows[0].chunks_completed as number,
      chunksFailed: rows[0].chunks_failed as number,
      totalChunks: rows[0].total_chunks as number,
    };
  }

  async incrementChunkFailed(jobId: string): Promise<{ chunksCompleted: number; chunksFailed: number; totalChunks: number }> {
    const { rows } = await this.pool.query(
      `UPDATE batch_jobs
       SET chunks_failed = chunks_failed + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING chunks_completed, chunks_failed, total_chunks`,
      [jobId]
    );
    return {
      chunksCompleted: rows[0].chunks_completed as number,
      chunksFailed: rows[0].chunks_failed as number,
      totalChunks: rows[0].total_chunks as number,
    };
  }

  async incrementJobCounters(
    jobId: string,
    processedRows: number,
    createdCount: number,
    errorCount: number,
    errors: { row: number; error: string }[]
  ): Promise<void> {
    const errorsJson = JSON.stringify(errors);
    await this.pool.query(
      `UPDATE batch_jobs
       SET processed_rows = processed_rows + $2,
           created_count = created_count + $3,
           error_count = error_count + $4,
           errors = CASE
             WHEN errors::text = '[]' THEN $5::jsonb
             ELSE (errors::jsonb || $5::jsonb)
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [jobId, processedRows, createdCount, errorCount, errorsJson]
    );
  }

  async getBatchJobById(id: string): Promise<BatchJob | undefined> {
    const { rows } = await this.pool.query(
      `SELECT id, seller_id, status, total_rows, processed_rows, created_count, error_count, errors,
              file_name, retry_count, max_retries, failed_at_row, s3_key,
              total_chunks, chunks_completed, chunks_failed, created_at, updated_at
       FROM batch_jobs WHERE id = $1`,
      [id]
    );
    return rows[0] ? this.toBatchJob(rows[0]) : undefined;
  }

  private toBatchJob(row: Record<string, unknown>): BatchJob {
    return {
      id: row.id as string,
      sellerId: row.seller_id as string,
      status: row.status as BatchJobStatus,
      totalRows: row.total_rows as number,
      processedRows: row.processed_rows as number,
      createdCount: row.created_count as number,
      errorCount: row.error_count as number,
      errors: (typeof row.errors === "string" ? JSON.parse(row.errors) : row.errors) as { row: number; error: string }[],
      fileName: row.file_name as string,
      retryCount: (row.retry_count as number) ?? 0,
      maxRetries: (row.max_retries as number) ?? 3,
      failedAtRow: (row.failed_at_row as number) ?? null,
      csvData: (row.csv_data as string) ?? null,
      s3Key: (row.s3_key as string) ?? null,
      totalChunks: (row.total_chunks as number) ?? 0,
      chunksCompleted: (row.chunks_completed as number) ?? 0,
      chunksFailed: (row.chunks_failed as number) ?? 0,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  // ── Notification operations ────────────────────────────────────

  async createNotification(notification: SellerNotification): Promise<void> {
    await this.pool.query(
      `INSERT INTO seller_notifications (id, seller_id, type, title, message, metadata, read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        notification.id, notification.sellerId, notification.type,
        notification.title, notification.message,
        JSON.stringify(notification.metadata), notification.read,
        notification.createdAt,
      ]
    );
  }

  async getNotifications(sellerId: string, limit = 50): Promise<SellerNotification[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM seller_notifications WHERE seller_id = $1 ORDER BY created_at DESC LIMIT $2",
      [sellerId, limit]
    );
    return rows.map((r) => this.toNotification(r));
  }

  async getUnreadNotificationCount(sellerId: string): Promise<number> {
    const { rows } = await this.pool.query(
      "SELECT COUNT(*) FROM seller_notifications WHERE seller_id = $1 AND read = false",
      [sellerId]
    );
    return parseInt(rows[0].count, 10);
  }

  async markNotificationRead(id: string, sellerId: string): Promise<boolean> {
    const result = await this.pool.query(
      "UPDATE seller_notifications SET read = true WHERE id = $1 AND seller_id = $2",
      [id, sellerId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markAllNotificationsRead(sellerId: string): Promise<void> {
    await this.pool.query(
      "UPDATE seller_notifications SET read = true WHERE seller_id = $1 AND read = false",
      [sellerId]
    );
  }

  private toNotification(row: Record<string, unknown>): SellerNotification {
    return {
      id: row.id as string,
      sellerId: row.seller_id as string,
      type: row.type as SellerNotification["type"],
      title: row.title as string,
      message: row.message as string,
      metadata: (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata) as Record<string, unknown>,
      read: row.read as boolean,
      createdAt: new Date(row.created_at as string),
    };
  }

  private toSellerSale(row: Record<string, unknown>): SellerSale {
    return {
      orderId: row.order_id as string,
      productId: row.product_id as string,
      productName: row.product_name as string,
      quantity: row.quantity as number,
      price: Number(row.price),
      total: Number(row.total),
      orderStatus: row.order_status as OrderStatus,
      buyerId: row.buyer_id as string,
      createdAt: new Date(row.created_at as string),
    };
  }
}
