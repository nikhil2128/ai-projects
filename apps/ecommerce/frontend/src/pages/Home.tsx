import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api";
import type { Product } from "../types";
import ProductCard from "../components/ProductCard";
import { useQuery } from "../hooks/useQuery";
import { useDebounce } from "../hooks/useDebounce";

const CATEGORIES = ["All", "Electronics", "Sports", "Home & Kitchen", "Accessories"];

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);

  const debouncedKeyword = useDebounce(keyword, 300);

  const queryKey = useMemo(() => {
    const params: string[] = [];
    if (debouncedKeyword) params.push(`k=${debouncedKeyword}`);
    if (category !== "All") params.push(`c=${category}`);
    if (minPrice) params.push(`min=${minPrice}`);
    if (maxPrice) params.push(`max=${maxPrice}`);
    params.push(`p=${page}`);
    return `products:${params.join("&")}`;
  }, [debouncedKeyword, category, minPrice, maxPrice, page]);

  const { data: result, loading } = useQuery(
    queryKey,
    () => {
      const params: Record<string, string | number> = { page, limit: 24 };
      if (debouncedKeyword) params.keyword = debouncedKeyword;
      if (category !== "All") params.category = category;
      if (minPrice) params.minPrice = Number(minPrice);
      if (maxPrice) params.maxPrice = Number(maxPrice);
      return api.products.list(params);
    },
    { staleTime: 15_000 }
  );

  const products: Product[] = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Discover Amazing Products
        </h1>
        <p className="text-gray-500 text-lg">
          Browse our curated collection of quality items
        </p>
      </div>

      <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 flex gap-4 items-center bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Price</label>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Price</label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Any"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="self-end px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Apply
            </button>
          </div>
        )}
      </form>

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              category === cat
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No products found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
