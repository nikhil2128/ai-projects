import { useState, useCallback, useMemo, useEffect } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_VALUE);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const hasSearch = debouncedSearchQuery.length > 0;
  const hasCategory = selectedCategory !== ALL_CATEGORIES_VALUE;
  const hasBothFilters = hasSearch && hasCategory;

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => fetchCategories(signal),
    staleTime: CATEGORIES_STALE_TIME_MS,
  });

  const productsQuery = useInfiniteQuery({
    queryKey: ["products", { search: debouncedSearchQuery, category: selectedCategory }],
    queryFn: ({ pageParam, signal }) => {
      if (hasBothFilters) {
        return searchProducts(debouncedSearchQuery, FILTERED_RESULTS_LIMIT, 0, signal);
      }
      if (hasSearch) {
        return searchProducts(debouncedSearchQuery, PAGE_SIZE, pageParam, signal);
      }
      if (hasCategory) {
        return fetchProductsByCategory(selectedCategory, PAGE_SIZE, pageParam, signal);
      }
      return fetchProducts(PAGE_SIZE, pageParam, signal);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (hasBothFilters) return undefined;
      const totalLoaded = allPages.reduce((sum, p) => sum + p.products.length, 0);
      return totalLoaded < lastPage.total ? totalLoaded : undefined;
    },
    staleTime: PRODUCTS_STALE_TIME_MS,
  });

  const { products, total } = useMemo(() => {
    const pages = productsQuery.data?.pages;
    if (!pages || pages.length === 0) return { products: [] as Product[], total: 0 };

    if (hasBothFilters) {
      const filtered = pages[0].products.filter(
        (product) => product.category === selectedCategory,
      );
      return { products: filtered, total: filtered.length };
    }

    return {
      products: pages.flatMap((page) => page.products),
      total: pages[0].total,
    };
  }, [productsQuery.data, hasBothFilters, selectedCategory]);

  const updateSearchQuery = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const updateSelectedCategory = useCallback((value: string) => {
    setSelectedCategory(value);
  }, []);

  return {
    products,
    categories: categoriesQuery.data ?? [],
    total,
    searchQuery,
    selectedCategory,
    loading: productsQuery.isLoading,
    isFetchingNextPage: productsQuery.isFetchingNextPage,
    hasNextPage: productsQuery.hasNextPage ?? false,
    fetchNextPage: productsQuery.fetchNextPage,
    error: productsQuery.error
      ? productsQuery.error instanceof Error
        ? productsQuery.error.message
        : "Something went wrong"
      : null,
    setSearchQuery: updateSearchQuery,
    setSelectedCategory: updateSelectedCategory,
    retry: () => {
      productsQuery.refetch();
    },
  };
}
