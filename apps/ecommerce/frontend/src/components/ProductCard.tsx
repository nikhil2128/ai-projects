import { memo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import type { Product } from "../types";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23e2e8f0'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const { isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();
  const [popping, setPopping] = useState(false);
  const favorited = isFavorite(product.id);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }
      setPopping(true);
      setTimeout(() => setPopping(false), 450);
      toggleFavorite(product.id);
    },
    [isLoggedIn, navigate, toggleFavorite, product.id]
  );

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <button
        onClick={handleFavoriteClick}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white hover:shadow-md transition-all"
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={`h-5 w-5 transition-colors ${
            popping ? "animate-heart-pop" : ""
          } ${
            favorited
              ? "fill-red-500 text-red-500"
              : "text-gray-400 hover:text-red-400"
          }`}
        />
      </button>

      <Link to={`/products/${product.id}`}>
        <div className="aspect-[4/3] overflow-hidden bg-gray-100">
          <img
            src={product.imageUrl || PLACEHOLDER}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        </div>
        <div className="p-4">
          <span className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-2">
            {product.category}
          </span>
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-lg font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                product.stock > 0
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-red-700 bg-red-50"
              }`}
            >
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
});

export default ProductCard;
