import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, ArrowLeft, ImagePlus } from "lucide-react";
import { api, ApiError } from "../../api";
import { invalidateQuery } from "../../hooks/useQuery";

const CATEGORIES = ["Electronics", "Sports", "Home & Kitchen", "Accessories", "Clothing", "Books", "Toys", "Health", "Other"];

export default function AddProduct() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.seller.createProduct({
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        stock: Number(stock),
        imageUrl: imageUrl.trim() || undefined,
      });
      invalidateQuery("seller:");
      navigate("/seller/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to="/seller/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Add Product</h1>
        <p className="text-gray-500 mt-1">Add a new product to your catalog</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6"
      >
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            placeholder="e.g. Wireless Bluetooth Headphones"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description *
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
            placeholder="Describe your product..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price ($) *
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              placeholder="29.99"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Quantity *
            </label>
            <input
              type="number"
              required
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              placeholder="100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL
          </label>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                className="h-11 w-11 rounded-xl object-cover border border-gray-200"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            )}
            {!imageUrl && (
              <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ImagePlus className="h-5 w-5 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            to="/seller/products"
            className="flex-1 flex items-center justify-center py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Add Product"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
