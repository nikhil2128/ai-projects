import type {
  AuthToken,
  Product,
  Cart,
  Order,
  Payment,
  PaymentMethod,
  SellerDashboardStats,
  SellerSale,
  ProductCreateInput,
  BatchUploadResult,
  BatchJob,
  PaginatedResult,
} from "./types";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const pendingRequests = new Map<string, Promise<unknown>>();

async function request<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15_000
): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const isGet = !options.method || options.method === "GET";
  const dedupeKey = isGet ? url : "";

  if (dedupeKey) {
    const inflight = pendingRequests.get(dedupeKey);
    if (inflight) return inflight as Promise<T>;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const promise = (async () => {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Request failed" }));
        throw new ApiError(res.status, body.error ?? "Request failed");
      }

      return res.json();
    } finally {
      clearTimeout(timeout);
      if (dedupeKey) pendingRequests.delete(dedupeKey);
    }
  })();

  if (dedupeKey) pendingRequests.set(dedupeKey, promise);

  return promise;
}

interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const api = {
  auth: {
    register(email: string, name: string, password: string, role: string = "buyer") {
      return request<{ id: string; email: string; name: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name, password, role }),
      });
    },
    login(email: string, password: string) {
      return request<AuthToken>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
  },

  products: {
    list(params?: { keyword?: string; category?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) {
      const query = new URLSearchParams();
      if (params?.keyword) query.set("keyword", params.keyword);
      if (params?.category) query.set("category", params.category);
      if (params?.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
      if (params?.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.limit !== undefined) query.set("limit", String(params.limit));
      const qs = query.toString();
      return request<PaginatedProducts>(`/api/products${qs ? `?${qs}` : ""}`);
    },
    get(id: string) {
      return request<Product>(`/api/products/${id}`);
    },
  },

  cart: {
    get() {
      return request<Cart>("/api/cart");
    },
    addItem(productId: string, quantity: number) {
      return request<Cart>("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      });
    },
    updateItem(productId: string, quantity: number) {
      return request<Cart>(`/api/cart/items/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ quantity }),
      });
    },
    removeItem(productId: string) {
      return request<Cart>(`/api/cart/items/${productId}`, {
        method: "DELETE",
      });
    },
    clear() {
      return request<Cart>("/api/cart", { method: "DELETE" });
    },
  },

  orders: {
    create(shippingAddress: string) {
      return request<Order>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ shippingAddress }),
      });
    },
    list() {
      return request<Order[]>("/api/orders");
    },
    get(id: string) {
      return request<Order>(`/api/orders/${id}`);
    },
    cancel(id: string) {
      return request<Order>(`/api/orders/${id}/cancel`, { method: "POST" });
    },
  },

  favorites: {
    list() {
      return request<{ productIds: string[] }>("/api/favorites");
    },
    products() {
      return request<Product[]>("/api/favorites/products");
    },
    check(productIds: string[]) {
      return request<{ favorited: string[] }>("/api/favorites/check", {
        method: "POST",
        body: JSON.stringify({ productIds }),
      });
    },
    add(productId: string) {
      return request<{ success: boolean }>(`/api/favorites/${productId}`, {
        method: "POST",
      });
    },
    remove(productId: string) {
      return request<{ success: boolean }>(`/api/favorites/${productId}`, {
        method: "DELETE",
      });
    },
  },

  seller: {
    dashboard() {
      return request<SellerDashboardStats>("/api/seller/dashboard");
    },
    products(params?: { page?: number; limit?: number }) {
      const query = new URLSearchParams();
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.limit !== undefined) query.set("limit", String(params.limit));
      const qs = query.toString();
      return request<PaginatedResult<Product>>(`/api/seller/products${qs ? `?${qs}` : ""}`);
    },
    createProduct(input: ProductCreateInput) {
      return request<Product>("/api/seller/products", {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
    batchCreateProducts(products: ProductCreateInput[]) {
      return request<BatchUploadResult>("/api/seller/products/batch", {
        method: "POST",
        body: JSON.stringify({ products }),
      });
    },
    updateProduct(id: string, updates: Partial<ProductCreateInput>) {
      return request<Product>(`/api/seller/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    deleteProduct(id: string) {
      return request<{ success: boolean }>(`/api/seller/products/${id}`, {
        method: "DELETE",
      });
    },
    async uploadBatchCSV(file: File): Promise<{ jobId: string }> {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      try {
        const res = await fetch("/api/seller/products/batch-upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new ApiError(res.status, body.error ?? "Upload failed");
        }

        return res.json();
      } finally {
        clearTimeout(timeout);
      }
    },
    getBatchJob(jobId: string) {
      return request<BatchJob>(`/api/seller/products/batch-jobs/${jobId}`);
    },
    getBatchJobs() {
      return request<BatchJob[]>("/api/seller/products/batch-jobs");
    },
    sales(params?: { page?: number; limit?: number }) {
      const query = new URLSearchParams();
      if (params?.page !== undefined) query.set("page", String(params.page));
      if (params?.limit !== undefined) query.set("limit", String(params.limit));
      const qs = query.toString();
      return request<PaginatedResult<SellerSale>>(`/api/seller/sales${qs ? `?${qs}` : ""}`);
    },
  },

  payments: {
    process(orderId: string, method: PaymentMethod) {
      return request<Payment>("/api/payments", {
        method: "POST",
        body: JSON.stringify({ orderId, method }),
      });
    },
    get(id: string) {
      return request<Payment>(`/api/payments/${id}`);
    },
    getByOrder(orderId: string) {
      return request<Payment>(`/api/payments/order/${orderId}`);
    },
    refund(id: string) {
      return request<Payment>(`/api/payments/${id}/refund`, { method: "POST" });
    },
  },
};

export { ApiError };
