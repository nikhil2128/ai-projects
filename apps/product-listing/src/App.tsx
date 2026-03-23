import { useMemo, useRef, useEffect, useCallback } from "react";
import { useFeatureFlags } from "./context/FeatureFlagContext";
import { useProducts } from "./hooks/useProducts";
import { Header } from "./components/Header";
import { ProductFilters } from "./components/ProductFilters";
import { ProductCard } from "./components/ProductCard";
import { ProductListItem } from "./components/ProductListItem";
import { ProductSkeletons } from "./components/ProductSkeleton";
import { ErrorState } from "./components/ErrorState";

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <svg
        className="h-8 w-8 animate-spin text-indigo-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export default function App() {
  const { viewMode } = useFeatureFlags();
  const {
    products,
    categories,
    total,
    searchQuery,
    selectedCategory,
    loading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    setSearchQuery,
    setSelectedCategory,
    retry,
  } = useProducts();

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const hasProducts = products.length > 0;
  const productResults = useMemo(() => {
    if (viewMode === "grid") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {products.map((product, index) => (
          <ProductListItem key={product.id} product={product} priority={index < 2} />
        ))}
      </div>
    );
  }, [products, viewMode]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header total={total} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductFilters
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          categories={categories}
          onSearchChange={setSearchQuery}
          onCategoryChange={setSelectedCategory}
        />

        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : loading ? (
          <ProductSkeletons />
        ) : !hasProducts ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">No products found</h2>
            <p className="mt-2 text-sm text-gray-500">
              Try a different search term or switch to another category.
            </p>
          </div>
        ) : (
          <>
            {productResults}

            {isFetchingNextPage && <LoadingSpinner />}

            <div ref={sentinelRef} aria-hidden="true" />
          </>
        )}
      </main>
    </div>
  );
}
