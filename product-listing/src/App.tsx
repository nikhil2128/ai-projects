import { useFeatureFlags } from "./context/FeatureFlagContext";
import { useProducts } from "./hooks/useProducts";
import { Header } from "./components/Header";
import { ProductFilters } from "./components/ProductFilters";
import { ProductCard } from "./components/ProductCard";
import { ProductListItem } from "./components/ProductListItem";
import { Pagination } from "./components/Pagination";
import { ProductSkeletons } from "./components/ProductSkeleton";
import { ErrorState } from "./components/ErrorState";

export default function App() {
  const { viewMode } = useFeatureFlags();
  const {
    products,
    categories,
    total,
    page,
    totalPages,
    searchQuery,
    selectedCategory,
    loading,
    error,
    setSearchQuery,
    setSelectedCategory,
    goToPage,
    retry,
  } = useProducts();

  const hasProducts = products.length > 0;

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
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <ProductListItem key={product.id} product={product} />
                ))}
              </div>
            )}

            <div className="mt-10">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
