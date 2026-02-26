import { Link } from "react-router-dom";
import {
  Loader2,
  Package,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { api } from "../../api";
import { useQuery } from "../../hooks/useQuery";
import type { OrderStatus } from "../../types";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "text-amber-700 bg-amber-50",
  confirmed: "text-blue-700 bg-blue-50",
  shipped: "text-indigo-700 bg-indigo-50",
  delivered: "text-emerald-700 bg-emerald-50",
  cancelled: "text-red-700 bg-red-50",
};

export default function SellerDashboard() {
  const { data: stats, loading } = useQuery(
    "seller:dashboard",
    () => api.seller.dashboard(),
    { staleTime: 30_000 }
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <Package className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Products</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Sales</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalSales}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${stats.totalRevenue.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            </div>
          </div>

          {stats.topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No sales yet</p>
          ) : (
            <div className="space-y-4">
              {stats.topProducts.map((product, idx) => (
                <div key={product.productId} className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-300 w-6 text-right">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.productName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {product.totalSold} sold
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    ${product.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
            </div>
            <Link
              to="/seller/sales"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {stats.recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSales.map((sale) => (
                <div
                  key={`${sale.orderId}-${sale.productId}`}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {sale.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        x{sale.quantity}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sale.orderStatus]}`}
                      >
                        {sale.orderStatus}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 ml-4">
                    ${sale.total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
