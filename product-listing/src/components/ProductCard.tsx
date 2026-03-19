import { memo } from "react";
import type { Product } from "../types/product";
import { StarRating } from "./StarRating";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export const ProductCard = memo(function ProductCard({
  product,
  priority = false,
}: ProductCardProps) {
  const discountedPrice = product.price * (1 - product.discountPercentage / 100);
  const isLowStock = product.availabilityStatus === "Low Stock";

  return (
    <article className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300 flex flex-col">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <img
          src={product.thumbnail}
          alt={product.title}
          className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
        {product.discountPercentage > 5 && (
          <span className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            -{Math.round(product.discountPercentage)}%
          </span>
        )}
        {isLowStock && (
          <span className="absolute top-3 right-3 bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
            Low Stock
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
            {product.category}
          </span>
          {product.brand && (
            <span className="text-xs text-gray-400">{product.brand}</span>
          )}
        </div>

        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 leading-snug">
          {product.title}
        </h3>

        <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
          {product.description}
        </p>

        <StarRating rating={product.rating} className="mb-3" />

        <div className="flex items-end gap-2 mt-auto">
          <span className="text-lg font-bold text-gray-900">
            ${discountedPrice.toFixed(2)}
          </span>
          {product.discountPercentage > 0 && (
            <span className="text-sm text-gray-400 line-through">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
});
