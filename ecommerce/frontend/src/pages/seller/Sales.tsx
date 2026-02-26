import { useState } from "react";
import {
  Loader2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  ShoppingBag,
} from "lucide-react";
import { api } from "../../api";
import { useQuery } from "../../hooks/useQuery";
import type { OrderStatus } from "../../types";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700 bg-amber-50",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-700 bg-blue-50",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  shipped: {
    label: "Shipped",
    color: "text-indigo-700 bg-indigo-50",
    icon: <Truck className="h-3.5 w-3.5" />,
  },
  delivered: {
    label: "Delivered",
    color: "text-emerald-700 bg-emerald-50",
    icon: <Package className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700 bg-red-50",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export default function SellerSales() {
  const [page, setPage] = useState(1);

  const queryKey = `seller:sales:p=${page}`;
  const { data: result, loading } = useQuery(
    queryKey,
    () => api.seller.sales({ page, limit: 20 }),
    { staleTime: 15_000 }
  );

  const sales = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  if (loading && sales.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
        <p className="text-gray-500 mt-1">
          Track all orders containing your products ({result?.total ?? 0} total)
        </p>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No sales yet</h2>
          <p className="text-gray-500">
            Sales will appear here once buyers purchase your products
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Product
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Order ID
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Qty
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Unit Price
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Total
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Status
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.map((sale) => {
                    const status = STATUS_CONFIG[sale.orderStatus];
                    return (
                      <tr
                        key={`${sale.orderId}-${sale.productId}`}
                        className="hover:bg-gray-50/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <TrendingUp className="h-4 w-4 text-gray-500" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                              {sale.productName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-400 font-mono">
                            {sale.orderId.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-gray-600">
                            {sale.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-600">
                            ${sale.price.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ${sale.total.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs text-gray-400">
                            {new Date(sale.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
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
