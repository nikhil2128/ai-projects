import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Plus,
  Upload,
  Pencil,
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
import { api, ApiError } from "../../api";
import { useQuery, invalidateQuery } from "../../hooks/useQuery";
import type { Product, ProductCreateInput } from "../../types";

export default function SellerProducts() {
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProductCreateInput>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const queryKey = `seller:products:p=${page}`;
  const { data: result, loading } = useQuery(
    queryKey,
    () => api.seller.products({ page, limit: 10 }),
    { staleTime: 10_000 }
  );

  const products = result?.data ?? [];
  const totalPages = result?.totalPages ?? 1;

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
      imageUrl: product.imageUrl,
    });
    setError("");
  }

  async function saveEdit(productId: string) {
    setError("");
    try {
      await api.seller.updateProduct(productId, editForm);
      setEditingId(null);
      invalidateQuery("seller:");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeleting(productId);
    setError("");
    try {
      await api.seller.deleteProduct(productId);
      invalidateQuery("seller:");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">
            Manage your product catalog ({result?.total ?? 0} products)
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/seller/products/batch"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
          >
            <Upload className="h-4 w-4" />
            Batch Upload
          </Link>
          <Link
            to="/seller/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No products yet</h2>
          <p className="text-gray-500 mb-6">Add your first product to start selling</p>
          <Link
            to="/seller/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
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
                      Category
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Price
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Stock
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50/50">
                      {editingId === product.id ? (
                        <>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editForm.name ?? ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editForm.category ?? ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, category: e.target.value })
                              }
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.price ?? ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, price: Number(e.target.value) })
                              }
                              className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              value={editForm.stock ?? ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, stock: Number(e.target.value) })
                              }
                              className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => saveEdit(product.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-10 w-10 rounded-lg object-cover bg-gray-100"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <Package className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]">
                                  {product.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-medium text-gray-900">
                              ${product.price.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`text-sm font-medium ${
                                product.stock === 0
                                  ? "text-red-600"
                                  : product.stock < 10
                                    ? "text-amber-600"
                                    : "text-gray-900"
                              }`}
                            >
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(product)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(product.id)}
                                disabled={deleting === product.id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              >
                                {deleting === product.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
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
