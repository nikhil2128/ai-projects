import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowLeft, Loader2, Minus, Plus, Check } from "lucide-react";
import { api, ApiError } from "../api";
import { useAuth } from "../context/AuthContext";
import type { Product } from "../types";

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%23e2e8f0'%3E%3Crect width='600' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.products.get(id).then(setProduct).catch(() => setProduct(null)).finally(() => setLoading(false));
  }, [id]);

  async function addToCart() {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (!product) return;

    setAdding(true);
    setError("");
    try {
      await api.cart.addItem(product.id, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 text-lg">Product not found</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Back to products
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 mb-6 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
          <img
            src={product.imageUrl || PLACEHOLDER}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
        </div>

        <div className="flex flex-col">
          <span className="inline-block self-start text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3">
            {product.category}
          </span>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>

          <p className="text-gray-500 text-lg leading-relaxed mb-6">
            {product.description}
          </p>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${
                product.stock > 0
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-red-700 bg-red-50"
              }`}
            >
              {product.stock > 0
                ? `${product.stock} in stock`
                : "Out of stock"}
            </span>
          </div>

          {product.stock > 0 && (
            <div className="flex flex-col gap-4 mt-auto">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Qty:</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 hover:bg-gray-100 rounded-l-lg transition"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity((q) => Math.min(product.stock, q + 1))
                    }
                    className="p-2 hover:bg-gray-100 rounded-r-lg transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                onClick={addToCart}
                disabled={adding}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition ${
                  added
                    ? "bg-emerald-600"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } disabled:opacity-60`}
              >
                {adding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : added ? (
                  <>
                    <Check className="h-5 w-5" />
                    Added to Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    Add to Cart
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
