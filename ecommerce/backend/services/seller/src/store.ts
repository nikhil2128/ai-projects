import { Pool } from "pg";
import { Product, SellerSale, OrderStatus, BatchJob, BatchJobStatus } from "../../../shared/types";

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
      `INSERT INTO batch_jobs (id, seller_id, status, total_rows, processed_rows, created_count, error_count, errors, file_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [job.id, job.sellerId, job.status, job.totalRows, job.processedRows, job.createdCount, job.errorCount, JSON.stringify(job.errors), job.fileName, job.createdAt, job.updatedAt]
    );
  }

  async updateBatchJob(id: string, updates: Partial<Pick<BatchJob, "status" | "processedRows" | "createdCount" | "errorCount" | "errors">>): Promise<void> {
    const sets: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.status !== undefined) { sets.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.processedRows !== undefined) { sets.push(`processed_rows = $${idx++}`); values.push(updates.processedRows); }
    if (updates.createdCount !== undefined) { sets.push(`created_count = $${idx++}`); values.push(updates.createdCount); }
    if (updates.errorCount !== undefined) { sets.push(`error_count = $${idx++}`); values.push(updates.errorCount); }
    if (updates.errors !== undefined) { sets.push(`errors = $${idx++}`); values.push(JSON.stringify(updates.errors)); }

    values.push(id);
    await this.pool.query(`UPDATE batch_jobs SET ${sets.join(", ")} WHERE id = $${idx}`, values);
  }

  async getBatchJob(id: string, sellerId: string): Promise<BatchJob | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM batch_jobs WHERE id = $1 AND seller_id = $2",
      [id, sellerId]
    );
    return rows[0] ? this.toBatchJob(rows[0]) : undefined;
  }

  async getRecentBatchJobs(sellerId: string, limit = 20): Promise<BatchJob[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM batch_jobs WHERE seller_id = $1 ORDER BY created_at DESC LIMIT $2",
      [sellerId, limit]
    );
    return rows.map((r) => this.toBatchJob(r));
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
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
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
