import { useFeatureFlags } from "./context/FeatureFlagContext";
import { useProducts } from "./hooks/useProducts";
import { Header } from "./components/Header";
import { ProductCard } from "./components/ProductCard";
import { ProductListItem } from "./components/ProductListItem";
import { Pagination } from "./components/Pagination";
import { ProductSkeletons } from "./components/ProductSkeleton";
import { ErrorState } from "./components/ErrorState";

export default function App() {
  const { viewMode } = useFeatureFlags();
  const { products, total, page, totalPages, loading, error, goToPage, retry } = useProducts();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header total={total} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : loading ? (
          <ProductSkeletons />
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
