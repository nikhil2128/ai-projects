import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeatureFlagProvider } from "../context/FeatureFlagContext";
import type { Product, ProductCategory } from "../types/product";
import type { ReactElement, ReactNode } from "react";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

export function createQueryWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = createTestQueryClient();
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <FeatureFlagProvider>{children}</FeatureFlagProvider>
      </QueryClientProvider>
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
