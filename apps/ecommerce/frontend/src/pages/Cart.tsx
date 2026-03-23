import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Trash2, Minus, Plus, Loader2, ShoppingBag, ArrowRight } from "lucide-react";
import { api, ApiError } from "../api";
import type { Cart as CartType } from "../types";

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartType | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.cart.get().then(setCart).catch(() => setCart(null)).finally(() => setLoading(false));
  }, []);

  const total = cart?.items.reduce((sum, i) => sum + i.price * i.quantity, 0) ?? 0;

  async function updateQuantity(productId: string, quantity: number) {
    setUpdating(productId);
    setError("");
    try {
      if (quantity <= 0) {
        setCart(await api.cart.removeItem(productId));
      } else {
        setCart(await api.cart.updateItem(productId, quantity));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  async function removeItem(productId: string) {
    setUpdating(productId);
    setError("");
    try {
      setCart(await api.cart.removeItem(productId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Remove failed");
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">
          Start shopping to add items to your cart
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
        >
          Browse Products
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {cart.items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200"
          >
            <div className="flex-1 min-w-0">
              <Link
                to={`/products/${item.productId}`}
                className="font-semibold text-gray-900 hover:text-indigo-600 transition line-clamp-1"
              >
                {item.productName}
              </Link>
              <p className="text-sm text-gray-500 mt-0.5">
                ${item.price.toFixed(2)} each
              </p>
            </div>

            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                disabled={updating === item.productId}
                className="p-1.5 hover:bg-gray-100 rounded-l-lg transition disabled:opacity-50"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center text-sm font-medium">
                {updating === item.productId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                ) : (
                  item.quantity
                )}
              </span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                disabled={updating === item.productId}
                className="p-1.5 hover:bg-gray-100 rounded-r-lg transition disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <span className="w-24 text-right font-semibold text-gray-900">
              ${(item.price * item.quantity).toFixed(2)}
            </span>

            <button
              onClick={() => removeItem(item.productId)}
              disabled={updating === item.productId}
              className="p-2 text-gray-400 hover:text-red-600 transition disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-600">
            Subtotal ({cart.items.reduce((s, i) => s + i.quantity, 0)} items)
          </span>
          <span className="text-2xl font-bold text-gray-900">
            ${total.toFixed(2)}
          </span>
        </div>
        <button
          onClick={() => navigate("/checkout")}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
        >
          Proceed to Checkout
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
