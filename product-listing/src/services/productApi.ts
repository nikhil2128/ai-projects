import type { ProductsResponse } from "../types/product";

const BASE_URL = "https://dummyjson.com";

export async function fetchProducts(
  limit: number = 10,
  skip: number = 0,
): Promise<ProductsResponse> {
  const res = await fetch(
    `${BASE_URL}/products?limit=${limit}&skip=${skip}&select=id,title,description,category,price,discountPercentage,rating,stock,tags,brand,thumbnail,images,availabilityStatus`,
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }

  return res.json();
}
