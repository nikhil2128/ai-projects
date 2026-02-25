import type { AuthToken, Product, Cart, Order, Payment, PaymentMethod } from "./types";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const pendingRequests = new Map<string, Promise<unknown>>();

async function request<T>(
  url: string,
  options: RequestInit = {}
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
  const timeout = setTimeout(() => controller.abort(), 15_000);

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
    register(email: string, name: string, password: string) {
      return request<{ id: string; email: string; name: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, name, password }),
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
