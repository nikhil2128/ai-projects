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

  createProduct(input: ProductCreateInput): ServiceResult<Product> {
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

    this.store.addProduct(product);
    return { success: true, data: product };
  }

  getProductById(id: string): ServiceResult<Product> {
    const product = this.store.findProductById(id);
    if (!product) {
      return { success: false, error: "Product not found" };
    }
    return { success: true, data: product };
  }

  getProductsByIds(ids: string[]): ServiceResult<Product[]> {
    const products = ids
      .map((id) => this.store.findProductById(id))
      .filter((p): p is Product => p !== undefined);
    return { success: true, data: products };
  }

  searchProducts(
    query: ProductSearchQuery
  ): ServiceResult<PaginatedResult<Product>> {
    let products = this.store.getAllProducts();

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

  updateStock(productId: string, newStock: number): ServiceResult<Product> {
    if (newStock < 0) {
      return { success: false, error: "Stock cannot be negative" };
    }

    const product = this.store.findProductById(productId);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    product.stock = newStock;
    this.store.updateProduct(product);
    return { success: true, data: product };
  }
}
