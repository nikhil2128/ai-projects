import { Heart, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useQuery } from "../hooks/useQuery";
import { useFavorites } from "../context/FavoritesContext";
import ProductCard from "../components/ProductCard";

export default function Favorites() {
  const { favoriteIds, loading: favLoading } = useFavorites();

  const ids = Array.from(favoriteIds);
  const queryKey = `favorites:products:${ids.join(",")}`;

  const { data: products, loading } = useQuery(
    queryKey,
    () => api.favorites.products(),
    { enabled: ids.length > 0, staleTime: 10_000 }
  );

  if (favLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-8 w-8 text-red-500 fill-red-500" />
        <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
        {ids.length > 0 && (
          <span className="text-sm text-gray-400 ml-1">
            ({ids.length} {ids.length === 1 ? "item" : "items"})
          </span>
        )}
      </div>

      {ids.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-1">No favorites yet</p>
          <p className="text-gray-400 text-sm mb-6">
            Browse products and tap the heart icon to save your favorites
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(products ?? []).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
