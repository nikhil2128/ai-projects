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

export async function fetchProducts(
  limit: number = 10,
  skip: number = 0,
): Promise<ProductsResponse> {
  const res = await fetch(createProductsUrl("/products", { limit, skip }));

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }

  return res.json();
}

export async function fetchProductsByCategory(
  category: string,
  limit: number = 10,
  skip: number = 0,
): Promise<ProductsResponse> {
  const res = await fetch(
    createProductsUrl(`/products/category/${encodeURIComponent(category)}`, { limit, skip }),
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch category products: ${res.status}`);
  }

  return res.json();
}

export async function searchProducts(
  query: string,
  limit: number = 10,
  skip: number = 0,
): Promise<ProductsResponse> {
  const res = await fetch(createProductsUrl("/products/search", { q: query, limit, skip }));

  if (!res.ok) {
    throw new Error(`Failed to search products: ${res.status}`);
  }

  return res.json();
}

export async function fetchCategories(): Promise<ProductCategory[]> {
  const res = await fetch(`${BASE_URL}/products/categories`);

  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }

  const categories = (await res.json()) as CategoryApiResponse[];

  return categories.map(normalizeCategory);
}
