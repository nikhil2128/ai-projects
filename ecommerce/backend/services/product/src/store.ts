import { Pool } from "pg";
import { Product } from "../../../shared/types";

export class ProductStore {
  constructor(private pool: Pool) {}

  async addProduct(product: Product): Promise<void> {
    await this.pool.query(
      `INSERT INTO products (id, name, description, price, category, stock, image_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        product.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.stock,
        product.imageUrl,
        product.createdAt,
      ]
    );
  }

  async findProductById(id: string): Promise<Product | undefined> {
    const { rows } = await this.pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );
    return rows[0] ? this.toProduct(rows[0]) : undefined;
  }

  async getAllProducts(): Promise<Product[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM products ORDER BY created_at DESC"
    );
    return rows.map((r) => this.toProduct(r));
  }

  async updateProduct(product: Product): Promise<void> {
    await this.pool.query(
      `UPDATE products
       SET name = $2, description = $3, price = $4, category = $5,
           stock = $6, image_url = $7
       WHERE id = $1`,
      [
        product.id,
        product.name,
        product.description,
        product.price,
        product.category,
        product.stock,
        product.imageUrl,
      ]
    );
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
      createdAt: new Date(row.created_at as string),
    };
  }
}
