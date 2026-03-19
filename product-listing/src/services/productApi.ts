import type { ProductCategory, ProductsResponse } from "../types/product";

const BASE_URL = "https://dummyjson.com";
const PRODUCT_FIELDS =
  "id,title,description,category,price,discountPercentage,rating,stock,tags,brand,thumbnail,images,availabilityStatus";
const CATEGORIES_CACHE_KEY = "product-listing:categories";
const PRODUCTS_CACHE_PREFIX = "product-listing:products:";
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const CATEGORIES_CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface RequestOptions {
  signal?: AbortSignal;
  cacheKey?: string;
  ttlMs?: number;
}

type CategoryApiResponse =
  | string
  | {
      slug: string;
      name: string;
      url?: string;
    };

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function createProductsUrl(path: string, params: Record<string, string | number>): string {
  const url = new URL(`${BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  url.searchParams.set("select", PRODUCT_FIELDS);

  return url.toString();
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readCache<T>(cacheKey: string): CacheEntry<T> | null {
  const cachedEntry = memoryCache.get(cacheKey);
  const now = Date.now();

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cachedEntry as CacheEntry<T>;
  }

  if (cachedEntry) {
    memoryCache.delete(cacheKey);
  }

  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(cacheKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as CacheEntry<T>;

    if (parsed.expiresAt <= now) {
      window.sessionStorage.removeItem(cacheKey);
      return null;
    }

    memoryCache.set(cacheKey, parsed as CacheEntry<unknown>);
    return parsed;
  } catch {
    window.sessionStorage.removeItem(cacheKey);
    return null;
  }
}

function writeCache<T>(cacheKey: string, data: T, ttlMs: number): T {
  const cacheEntry: CacheEntry<T> = {
    data,
    expiresAt: Date.now() + ttlMs,
  };

  memoryCache.set(cacheKey, cacheEntry as CacheEntry<unknown>);

  if (isBrowser()) {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  }

  return data;
}

async function fetchJson<T>(
  url: string,
  errorMessage: string,
  { signal, cacheKey = url, ttlMs = DEFAULT_CACHE_TTL_MS }: RequestOptions = {},
): Promise<T> {
  const cachedEntry = readCache<T>(cacheKey);
  if (cachedEntry) {
    return cachedEntry.data;
  }

  const existingRequest = inFlightRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest as Promise<T>;
  }

  const request = fetch(url, { signal })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`${errorMessage}: ${res.status}`);
      }

      const data = (await res.json()) as T;
      return writeCache(cacheKey, data, ttlMs);
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, request);

  return request;
}

function normalizeCategory(category: CategoryApiResponse): ProductCategory {
  if (typeof category === "string") {
    return {
      slug: category,
      name: category
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    };
  }

  return {
    slug: category.slug,
    name: category.name,
  };
}

export function clearProductApiCache() {
  memoryCache.clear();
  inFlightRequests.clear();

  if (!isBrowser()) {
    return;
  }

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith("product-listing:")) {
      window.sessionStorage.removeItem(key);
    }
  }
}

export function getCachedCategories(): ProductCategory[] | null {
  const categories = readCache<CategoryApiResponse[]>(CATEGORIES_CACHE_KEY)?.data;
  return categories ? categories.map(normalizeCategory) : null;
}

export function getCachedProducts(limit: number = 10, skip: number = 0): ProductsResponse | null {
  const url = createProductsUrl("/products", { limit, skip });
  return readCache<ProductsResponse>(`${PRODUCTS_CACHE_PREFIX}${url}`)?.data ?? null;
}

export async function fetchProducts(
  limit: number = 10,
  skip: number = 0,
  options?: RequestOptions,
): Promise<ProductsResponse> {
  const url = createProductsUrl("/products", { limit, skip });
  return fetchJson<ProductsResponse>(url, "Failed to fetch products", {
    ...options,
    cacheKey: `${PRODUCTS_CACHE_PREFIX}${url}`,
  });
}

export async function fetchProductsByCategory(
  category: string,
  limit: number = 10,
  skip: number = 0,
  options?: RequestOptions,
): Promise<ProductsResponse> {
  return fetchJson<ProductsResponse>(
    createProductsUrl(`/products/category/${encodeURIComponent(category)}`, { limit, skip }),
    "Failed to fetch category products",
    options,
  );
}

export async function searchProducts(
  query: string,
  limit: number = 10,
  skip: number = 0,
  options?: RequestOptions,
): Promise<ProductsResponse> {
  return fetchJson<ProductsResponse>(
    createProductsUrl("/products/search", { q: query, limit, skip }),
    "Failed to search products",
    options,
  );
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const categories = await fetchJson<CategoryApiResponse[]>(
    `${BASE_URL}/products/categories`,
    "Failed to fetch categories",
    {
      cacheKey: CATEGORIES_CACHE_KEY,
      ttlMs: CATEGORIES_CACHE_TTL_MS,
    },
  );

  return categories.map(normalizeCategory);
}
