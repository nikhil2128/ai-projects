import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
} from "lucide-react";
import { api, ApiError } from "../../api";
import { invalidateQuery } from "../../hooks/useQuery";
import type { ProductCreateInput, BatchUploadResult } from "../../types";

function parseCSV(text: string): ProductCreateInput[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const descIdx = headers.indexOf("description");
  const priceIdx = headers.indexOf("price");
  const categoryIdx = headers.indexOf("category");
  const stockIdx = headers.indexOf("stock");
  const imageIdx = headers.indexOf("imageurl");

  if (nameIdx === -1 || priceIdx === -1) return [];

  const products: ProductCreateInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length === 0) continue;

    products.push({
      name: cols[nameIdx]?.trim() ?? "",
      description: cols[descIdx]?.trim() ?? "",
      price: Number(cols[priceIdx]?.trim() ?? 0),
      category: cols[categoryIdx]?.trim() ?? "",
      stock: Number(cols[stockIdx]?.trim() ?? 0),
      imageUrl: cols[imageIdx]?.trim(),
    });
  }

  return products;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

const TEMPLATE_CSV = `name,description,price,category,stock,imageUrl
"Wireless Headphones","High quality Bluetooth headphones with noise cancellation",79.99,"Electronics",150,""
"Yoga Mat","Premium non-slip yoga mat, 6mm thick",29.99,"Sports",200,""
"Coffee Maker","12-cup programmable coffee maker with thermal carafe",89.99,"Home & Kitchen",75,""`;

export default function BatchUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<ProductCreateInput[]>([]);
  const [jsonInput, setJsonInput] = useState("");
  const [mode, setMode] = useState<"csv" | "json">("csv");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BatchUploadResult | null>(null);
  const [error, setError] = useState("");

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setError("No valid products found in CSV. Ensure headers include: name, description, price, category, stock");
        return;
      }
      setProducts(parsed);
    };
    reader.readAsText(file);
  }

  function handleJsonParse() {
    setError("");
    setResult(null);
    try {
      const parsed = JSON.parse(jsonInput);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      setProducts(items);
    } catch {
      setError("Invalid JSON format");
    }
  }

  function clearProducts() {
    setProducts([]);
    setFileName("");
    setJsonInput("");
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (products.length === 0) return;
    setUploading(true);
    setError("");
    setResult(null);

    try {
      const uploadResult = await api.seller.batchCreateProducts(products);
      setResult(uploadResult);
      invalidateQuery("seller:");
      if (uploadResult.errors.length === 0) {
        setProducts([]);
        setFileName("");
        setJsonInput("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/seller/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Batch Upload</h1>
        <p className="text-gray-500 mt-1">
          Upload multiple products at once via CSV or JSON
        </p>
      </div>

      {result && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            result.errors.length === 0
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.errors.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-gray-900">
                {result.created} product{result.created !== 1 ? "s" : ""} created
                successfully
              </p>
              {result.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-amber-800">
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                  </p>
                  {result.errors.map((err) => (
                    <p key={err.index} className="text-sm text-amber-700">
                      Row {err.index + 1}: {err.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
        <div className="flex gap-3">
          <button
            onClick={() => { setMode("csv"); clearProducts(); }}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
              mode === "csv"
                ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-600"
                : "bg-gray-50 text-gray-600 border-2 border-transparent hover:border-gray-200"
            }`}
          >
            <FileSpreadsheet className="h-5 w-5 mx-auto mb-1" />
            CSV Upload
          </button>
          <button
            onClick={() => { setMode("json"); clearProducts(); }}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
              mode === "json"
                ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-600"
                : "bg-gray-50 text-gray-600 border-2 border-transparent hover:border-gray-200"
            }`}
          >
            <Upload className="h-5 w-5 mx-auto mb-1" />
            JSON Input
          </button>
        </div>

        {mode === "csv" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Upload a CSV with columns: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">name, description, price, category, stock, imageUrl</code>
              </p>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                Template
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileSpreadsheet className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              {fileName ? (
                <p className="text-sm font-medium text-gray-900">{fileName}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-600">
                    Click to select a CSV file
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Maximum 500 products per upload
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Paste a JSON array of products:
            </p>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
              placeholder={`[
  {
    "name": "Product Name",
    "description": "Description",
    "price": 29.99,
    "category": "Electronics",
    "stock": 100
  }
]`}
            />
            <button
              onClick={handleJsonParse}
              disabled={!jsonInput.trim()}
              className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              Parse JSON
            </button>
          </div>
        )}

        {products.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {products.length} product{products.length !== 1 ? "s" : ""} ready to upload
              </p>
              <button
                onClick={clearProducts}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>

            <div className="max-h-60 overflow-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">#</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Category</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Price</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.slice(0, 50).map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2 text-gray-900 truncate max-w-[200px]">{p.name}</td>
                      <td className="px-4 py-2 text-gray-600">{p.category}</td>
                      <td className="px-4 py-2 text-right text-gray-900">${p.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-gray-900">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length > 50 && (
                <p className="px-4 py-2 text-xs text-gray-400 text-center bg-gray-50">
                  ...and {products.length - 50} more
                </p>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Upload {products.length} Product{products.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
