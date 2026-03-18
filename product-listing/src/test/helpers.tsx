import { render, type RenderOptions } from "@testing-library/react";
import { FeatureFlagProvider } from "../context/FeatureFlagContext";
import type { Product, ProductCategory } from "../types/product";
import type { ReactElement } from "react";

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <FeatureFlagProvider>{children}</FeatureFlagProvider>
    ),
    ...options,
  });
}

export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    title: "Test Product",
    description: "A great product for testing",
    category: "electronics",
    price: 100,
    discountPercentage: 10,
    rating: 4.5,
    stock: 50,
    tags: ["test", "product"],
    brand: "TestBrand",
    thumbnail: "https://example.com/thumb.jpg",
    images: ["https://example.com/img1.jpg"],
    availabilityStatus: "In Stock",
    ...overrides,
  };
}

export function createCategory(overrides: Partial<ProductCategory> = {}): ProductCategory {
  return {
    slug: "electronics",
    name: "Electronics",
    ...overrides,
  };
}
