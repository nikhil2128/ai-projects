import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Product, ProductCategory } from "../types/product";
import {
  fetchCategories,
  fetchProducts,
  fetchProductsByCategory,
  getCachedCategories,
  getCachedProducts,
  searchProducts,
} from "../services/productApi";

const PAGE_SIZE = 10;
const FILTERED_RESULTS_LIMIT = 100;
const ALL_CATEGORIES_VALUE = "all";

export function useProducts() {
  const initialProductsResponse = useMemo(() => getCachedProducts(PAGE_SIZE, 0), []);
  const initialCategories = useMemo(() => getCachedCategories() ?? [], []);
  const shouldSkipInitialProductsFetch = useRef(Boolean(initialProductsResponse));
  const shouldSkipInitialCategoriesFetch = useRef(initialCategories.length > 0);
  const latestRequestId = useRef(0);

  const [products, setProducts] = useState<Product[]>(() => initialProductsResponse?.products ?? []);
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories);
  const [total, setTotal] = useState(() => initialProductsResponse?.total ?? 0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES_VALUE);
  const [loading, setLoading] = useState(() => !initialProductsResponse);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch {
        setCategories([]);
      }
    };

    if (shouldSkipInitialCategoriesFetch.current) {
      shouldSkipInitialCategoriesFetch.current = false;
      return;
    }

    loadCategories();
  }, []);

  const loadProducts = useCallback(
    async (currentPage: number, query: string, category: string) => {
      const requestId = ++latestRequestId.current;

      setLoading(true);
      setError(null);

      try {
        const skip = (currentPage - 1) * PAGE_SIZE;

        if (query && category !== ALL_CATEGORIES_VALUE) {
          const searchResults = await searchProducts(query, FILTERED_RESULTS_LIMIT, 0);
          const filteredProducts = searchResults.products.filter(
            (product) => product.category === category,
          );

          if (requestId !== latestRequestId.current) {
            return;
          }

          setProducts(filteredProducts.slice(skip, skip + PAGE_SIZE));
          setTotal(filteredProducts.length);
          return;
        }

        const data = query
          ? await searchProducts(query, PAGE_SIZE, skip)
          : category !== ALL_CATEGORIES_VALUE
            ? await fetchProductsByCategory(category, PAGE_SIZE, skip)
            : await fetchProducts(PAGE_SIZE, skip);

        if (requestId !== latestRequestId.current) {
          return;
        }

        setProducts(data.products);
        setTotal(data.total);
      } catch (err) {
        if (requestId !== latestRequestId.current) {
          return;
        }

        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (requestId === latestRequestId.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (
      shouldSkipInitialProductsFetch.current &&
      page === 1 &&
      debouncedSearchQuery === "" &&
      selectedCategory === ALL_CATEGORIES_VALUE
    ) {
      shouldSkipInitialProductsFetch.current = false;
      return;
    }

    loadProducts(page, debouncedSearchQuery, selectedCategory);
  }, [page, debouncedSearchQuery, selectedCategory, loadProducts]);

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
    categories,
    total,
    page,
    totalPages,
    searchQuery,
    selectedCategory,
    loading,
    error,
    setSearchQuery: updateSearchQuery,
    setSelectedCategory: updateSelectedCategory,
    goToPage,
    retry: () => loadProducts(page, debouncedSearchQuery, selectedCategory),
  };
}
