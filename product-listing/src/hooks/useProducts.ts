import { useState, useEffect, useCallback } from "react";
import type { Product } from "../types/product";
import { fetchProducts } from "../services/productApi";

const PAGE_SIZE = 10;

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async (currentPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const skip = (currentPage - 1) * PAGE_SIZE;
      const data = await fetchProducts(PAGE_SIZE, skip);
      setProducts(data.products);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(page);
  }, [page, loadProducts]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
    total,
    page,
    totalPages,
    loading,
    error,
    goToPage,
    retry: () => loadProducts(page),
  };
}
