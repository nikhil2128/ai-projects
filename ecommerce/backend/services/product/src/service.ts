import { v4 as uuidv4 } from "uuid";
import {
  Product,
  ProductCreateInput,
  ProductSearchQuery,
  PaginatedResult,
  ServiceResult,
} from "../../../shared/types";
import { ProductStore } from "./store";

const DEFAULT_PAGE_LIMIT = 24;
const MAX_PAGE_LIMIT = 100;

export class ProductService {
  constructor(private store: ProductStore) {}

  async createProduct(input: ProductCreateInput): Promise<ServiceResult<Product>> {
    if (!input.name.trim()) {
      return { success: false, error: "Product name is required" };
    }

    if (input.price <= 0) {
      return { success: false, error: "Price must be positive" };
    }

    if (input.stock < 0) {
      return { success: false, error: "Stock cannot be negative" };
    }

    const product: Product = {
      id: uuidv4(),
      name: input.name,
      description: input.description,
      price: input.price,
      category: input.category,
      stock: input.stock,
      imageUrl: input.imageUrl ?? "",
      createdAt: new Date(),
    };

    await this.store.addProduct(product);
    return { success: true, data: product };
  }

  async getProductById(id: string): Promise<ServiceResult<Product>> {
    const product = await this.store.findProductById(id);
    if (!product) {
      return { success: false, error: "Product not found" };
    }
    return { success: true, data: product };
  }

  async getProductsByIds(ids: string[]): Promise<ServiceResult<Product[]>> {
    const products: Product[] = [];
    for (const id of ids) {
      const p = await this.store.findProductById(id);
      if (p) products.push(p);
    }
    return { success: true, data: products };
  }

  async searchProducts(
    query: ProductSearchQuery
  ): Promise<ServiceResult<PaginatedResult<Product>>> {
    let products = await this.store.getAllProducts();

    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw)
      );
    }

    if (query.category) {
      products = products.filter((p) => p.category === query.category);
    }

    if (query.minPrice !== undefined) {
      products = products.filter((p) => p.price >= query.minPrice!);
    }

    if (query.maxPrice !== undefined) {
      products = products.filter((p) => p.price <= query.maxPrice!);
    }

    const total = products.length;
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, query.limit ?? DEFAULT_PAGE_LIMIT));
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedProducts = products.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        data: paginatedProducts,
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async updateStock(productId: string, newStock: number): Promise<ServiceResult<Product>> {
    if (newStock < 0) {
      return { success: false, error: "Stock cannot be negative" };
    }

    const product = await this.store.findProductById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    product.stock = newStock;
    await this.store.updateProduct(product);
    return { success: true, data: product };
  }
}
