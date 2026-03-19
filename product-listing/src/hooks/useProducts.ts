import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "../types/product";
import {
  fetchCategories,
  fetchProducts,
  fetchProductsByCategory,
  searchProducts,
} from "../services/productApi";

const PAGE_SIZE = 10;
const FILTERED_RESULTS_LIMIT = 100;
const ALL_CATEGORIES_VALUE = "all";
const PRODUCTS_STALE_TIME_MS = 5 * 60 * 1000;
const CATEGORIES_STALE_TIME_MS = 60 * 60 * 1000;

function useDebounce(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value.trim()), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

export function useProducts() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_VALUE);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const skip = (page - 1) * PAGE_SIZE;
  const hasSearch = debouncedSearchQuery.length > 0;
  const hasCategory = selectedCategory !== ALL_CATEGORIES_VALUE;
  const hasBothFilters = hasSearch && hasCategory;

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: CATEGORIES_STALE_TIME_MS,
  });

  const productsQuery = useQuery({
    queryKey: ["products", { search: debouncedSearchQuery, category: selectedCategory, page }],
    queryFn: ({ signal }) => {
      if (hasBothFilters) {
        return searchProducts(debouncedSearchQuery, FILTERED_RESULTS_LIMIT, 0, signal);
      }
      if (hasSearch) {
        return searchProducts(debouncedSearchQuery, PAGE_SIZE, skip, signal);
      }
      if (hasCategory) {
        return fetchProductsByCategory(selectedCategory, PAGE_SIZE, skip, signal);
      }
      return fetchProducts(PAGE_SIZE, skip, signal);
    },
    staleTime: PRODUCTS_STALE_TIME_MS,
  });

  const { products, total } = useMemo(() => {
    const data = productsQuery.data;
    if (!data) return { products: [] as Product[], total: 0 };

    if (hasBothFilters) {
      const filtered = data.products.filter(
        (product) => product.category === selectedCategory,
      );
      return {
        products: filtered.slice(skip, skip + PAGE_SIZE),
        total: filtered.length,
      };
    }

    return { products: data.products, total: data.total };
  }, [productsQuery.data, hasBothFilters, selectedCategory, skip]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const updateSearchQuery = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const updateSelectedCategory = useCallback((value: string) => {
    setSelectedCategory(value);
    setPage(1);
  }, []);

  const goToPage = useCallback(
    (p: number) => {
      if (p >= 1 && p <= totalPages) {
        setPage(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages],
  );

  return {
    products,
    categories: categoriesQuery.data ?? [],
    total,
    page,
    totalPages,
    searchQuery,
    selectedCategory,
    loading: productsQuery.isLoading,
    error: productsQuery.error
      ? productsQuery.error instanceof Error
        ? productsQuery.error.message
        : "Something went wrong"
      : null,
    setSearchQuery: updateSearchQuery,
    setSelectedCategory: updateSelectedCategory,
    goToPage,
    retry: () => {
      productsQuery.refetch();
    },
  };
}
