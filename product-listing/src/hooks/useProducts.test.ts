import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProducts } from "./useProducts";
import * as api from "../services/productApi";
import { createProduct, createCategory, createQueryWrapper } from "../test/helpers";

vi.mock("../services/productApi");

const mockFetchProducts = vi.mocked(api.fetchProducts);
const mockFetchProductsByCategory = vi.mocked(api.fetchProductsByCategory);
const mockSearchProducts = vi.mocked(api.searchProducts);
const mockFetchCategories = vi.mocked(api.fetchCategories);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });

  mockFetchCategories.mockResolvedValue([
    createCategory({ slug: "electronics", name: "Electronics" }),
    createCategory({ slug: "clothing", name: "Clothing" }),
  ]);

  mockFetchProducts.mockResolvedValue({
    products: [createProduct({ id: 1 }), createProduct({ id: 2 })],
    total: 20,
    skip: 0,
    limit: 10,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useProducts", () => {
  it("loads products and categories on mount", async () => {
    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.total).toBe(20);
    expect(result.current.categories).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("handles category fetch failure gracefully", async () => {
    mockFetchCategories.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual([]);
    expect(result.current.products).toHaveLength(2);
  });

  it("handles product fetch failure", async () => {
    mockFetchProducts.mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Server error");
    expect(result.current.products).toEqual([]);
  });

  it("handles non-Error throw", async () => {
    mockFetchProducts.mockRejectedValueOnce("string error");

    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Something went wrong");
  });

  it("debounces search query", async () => {
    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSearchProducts.mockResolvedValueOnce({
      products: [createProduct({ id: 10, title: "Phone" })],
      total: 1,
      skip: 0,
      limit: 10,
    });

    act(() => {
      result.current.setSearchQuery("phone");
    });

    expect(result.current.searchQuery).toBe("phone");
    expect(mockSearchProducts).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockSearchProducts).toHaveBeenCalledWith("phone", 10, 0, expect.anything());
    });
  });

  it("fetches by category when category is selected", async () => {
    mockFetchProductsByCategory.mockResolvedValueOnce({
      products: [createProduct({ id: 5, category: "clothing" })],
      total: 5,
      skip: 0,
      limit: 10,
    });

    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedCategory("clothing");
    });

    await waitFor(() => {
      expect(mockFetchProductsByCategory).toHaveBeenCalledWith("clothing", 10, 0, expect.anything());
    });
  });

  it("does client-side filtering when both search and category are set", async () => {
    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockSearchProducts.mockResolvedValueOnce({
      products: [
        createProduct({ id: 1, category: "electronics", title: "Phone" }),
        createProduct({ id: 2, category: "clothing", title: "Phone Case" }),
        createProduct({ id: 3, category: "electronics", title: "Tablet" }),
      ],
      total: 3,
      skip: 0,
      limit: 100,
    });

    act(() => {
      result.current.setSelectedCategory("electronics");
      result.current.setSearchQuery("phone");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(mockSearchProducts).toHaveBeenCalledWith("phone", 100, 0, expect.anything());
    });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.total).toBe(2);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("fetches next page when fetchNextPage is called", async () => {
    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);

    mockFetchProducts.mockResolvedValueOnce({
      products: [createProduct({ id: 3 }), createProduct({ id: 4 })],
      total: 20,
      skip: 2,
      limit: 10,
    });

    act(() => {
      result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(4);
    });
  });

  it("reports hasNextPage as false when all products are loaded", async () => {
    mockFetchProducts.mockResolvedValueOnce({
      products: [createProduct({ id: 1 }), createProduct({ id: 2 })],
      total: 2,
      skip: 0,
      limit: 10,
    });

    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(false);
  });

  it("retries loading products", async () => {
    mockFetchProducts.mockRejectedValueOnce(new Error("fail"));

    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.error).toBe("fail");
    });

    mockFetchProducts.mockResolvedValueOnce({
      products: [createProduct()],
      total: 1,
      skip: 0,
      limit: 10,
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });

    expect(result.current.products).toHaveLength(1);
  });

  it("trims whitespace from search query for debounce", async () => {
    const { result } = renderHook(() => useProducts(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery("   ");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSearchProducts).not.toHaveBeenCalled();
  });
});
