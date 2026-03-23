import type { ProductCategory, ProductsResponse } from "../types/product";

const BASE_URL = "https://dummyjson.com";
const PRODUCT_FIELDS =
  "id,title,description,category,price,discountPercentage,rating,stock,tags,brand,thumbnail,images,availabilityStatus";

type CategoryApiResponse =
  | string
  | {
      slug: string;
      name: string;
      url?: string;
    };

function createProductsUrl(path: string, params: Record<string, string | number>): string {
  const url = new URL(`${BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  url.searchParams.set("select", PRODUCT_FIELDS);

  return url.toString();
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

async function fetchJson<T>(url: string, errorMessage: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new Error(`${errorMessage}: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchProducts(
  limit: number = 10,
  skip: number = 0,
  signal?: AbortSignal,
): Promise<ProductsResponse> {
  return fetchJson<ProductsResponse>(
    createProductsUrl("/products", { limit, skip }),
    "Failed to fetch products",
    signal,
  );
}

export async function fetchProductsByCategory(
  category: string,
  limit: number = 10,
  skip: number = 0,
  signal?: AbortSignal,
): Promise<ProductsResponse> {
  return fetchJson<ProductsResponse>(
    createProductsUrl(`/products/category/${encodeURIComponent(category)}`, { limit, skip }),
    "Failed to fetch category products",
    signal,
  );
}

export async function searchProducts(
  query: string,
  limit: number = 10,
  skip: number = 0,
  signal?: AbortSignal,
): Promise<ProductsResponse> {
  return fetchJson<ProductsResponse>(
    createProductsUrl("/products/search", { q: query, limit, skip }),
    "Failed to search products",
    signal,
  );
}

export async function fetchCategories(signal?: AbortSignal): Promise<ProductCategory[]> {
  const categories = await fetchJson<CategoryApiResponse[]>(
    `${BASE_URL}/products/categories`,
    "Failed to fetch categories",
    signal,
  );

  return categories.map(normalizeCategory);
}
