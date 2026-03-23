import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { api, ApiError } from "../api";
import type { Order, OrderStatus } from "../types";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700 bg-amber-50",
    icon: <Clock className="h-4 w-4" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-700 bg-blue-50",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  shipped: {
    label: "Shipped",
    color: "text-indigo-700 bg-indigo-50",
    icon: <Truck className="h-4 w-4" />,
  },
  delivered: {
    label: "Delivered",
    color: "text-emerald-700 bg-emerald-50",
    icon: <Package className="h-4 w-4" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700 bg-red-50",
    icon: <XCircle className="h-4 w-4" />,
  },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.orders
      .list()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  async function cancelOrder(id: string) {
    setCancelling(id);
    setError("");
    try {
      const updated = await api.orders.cancel(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancel failed");
    } finally {
      setCancelling(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-6">
          Place your first order to see it here
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Orders</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const status = STATUS_CONFIG[order.status];
          return (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">
                    {order.id}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}
                >
                  {status.icon}
                  {status.label}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600">
                      {item.productName} x {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <span className="text-sm text-gray-500">Total: </span>
                  <span className="text-lg font-bold text-gray-900">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>
                {(order.status === "pending" ||
                  order.status === "confirmed") && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    disabled={cancelling === order.id}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                  >
                    {cancelling === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Cancel Order"
                    )}
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs text-gray-400">
                Ship to: {order.shippingAddress}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
