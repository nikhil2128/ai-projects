import { useState, useRef, useEffect, useCallback } from "react";
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
  Clock,
  RotateCw,
  Zap,
} from "lucide-react";
import { api, ApiError } from "../../api";
import { invalidateQuery } from "../../hooks/useQuery";
import type { ProductCreateInput, BatchUploadResult, BatchJob } from "../../types";

const SMALL_BATCH_LIMIT = 500;

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

function validateCSVHeaders(text: string): { valid: boolean; rowCount: number; error?: string } {
  const firstNewline = text.indexOf("\n");
  if (firstNewline === -1) return { valid: false, rowCount: 0, error: "CSV file is empty" };

  const headerLine = text.substring(0, firstNewline);
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  if (!headers.includes("name") || !headers.includes("price")) {
    return { valid: false, rowCount: 0, error: "CSV must include 'name' and 'price' columns" };
  }

  let rowCount = 0;
  for (let i = firstNewline + 1; i < text.length; i++) {
    if (text[i] === "\n") rowCount++;
  }
  if (text[text.length - 1] !== "\n") rowCount++;

  return { valid: true, rowCount };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "text-emerald-600 bg-emerald-50";
    case "processing": return "text-blue-600 bg-blue-50";
    case "pending": return "text-amber-600 bg-amber-50";
    case "failed": return "text-red-600 bg-red-50";
    default: return "text-gray-600 bg-gray-50";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed": return <CheckCircle2 className="h-4 w-4" />;
    case "processing": return <Loader2 className="h-4 w-4 animate-spin" />;
    case "pending": return <Clock className="h-4 w-4" />;
    case "failed": return <AlertCircle className="h-4 w-4" />;
    default: return null;
  }
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
  const [fileSize, setFileSize] = useState(0);
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BatchUploadResult | null>(null);
  const [error, setError] = useState("");

  const [isLargeFile, setIsLargeFile] = useState(false);
  const [largeFileRowCount, setLargeFileRowCount] = useState(0);
  const [activeJob, setActiveJob] = useState<BatchJob | null>(null);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [showJobHistory, setShowJobHistory] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback((jobId: string) => {
    stopPolling();

    const poll = async () => {
      try {
        const job = await api.seller.getBatchJob(jobId);
        setActiveJob(job);
        if (job.status === "completed" || job.status === "failed") {
          stopPolling();
          invalidateQuery("seller:");
          loadBatchJobs();
        }
      } catch {
        stopPolling();
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 2000);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  async function loadBatchJobs() {
    try {
      const jobs = await api.seller.getBatchJobs();
      setBatchJobs(jobs);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadBatchJobs();
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    setError("");
    setResult(null);
    setActiveJob(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);

      const validation = validateCSVHeaders(text);
      if (!validation.valid) {
        setError(validation.error ?? "Invalid CSV format");
        return;
      }

      if (validation.rowCount > SMALL_BATCH_LIMIT) {
        setIsLargeFile(true);
        setLargeFileRowCount(validation.rowCount);
        setProducts([]);
      } else {
        setIsLargeFile(false);
        setLargeFileRowCount(0);
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setError("No valid products found. Ensure headers include: name, description, price, category, stock");
          return;
        }
        setProducts(parsed);
      }
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
      setIsLargeFile(false);
    } catch {
      setError("Invalid JSON format");
    }
  }

  function clearProducts() {
    setProducts([]);
    setFileName("");
    setFileSize(0);
    setCsvText("");
    setJsonInput("");
    setResult(null);
    setError("");
    setIsLargeFile(false);
    setLargeFileRowCount(0);
    setActiveJob(null);
    stopPolling();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSmallUpload() {
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

  async function handleLargeUpload() {
    if (!csvText) return;
    setUploading(true);
    setError("");

    try {
      const { jobId } = await api.seller.uploadBatchCSV(csvText, fileName);
      setCsvText("");
      setFileName("");
      setFileSize(0);
      setIsLargeFile(false);
      setLargeFileRowCount(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      pollJobStatus(jobId);
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

  const progressPercent = activeJob
    ? activeJob.totalRows > 0
      ? Math.round((activeJob.processedRows / activeJob.totalRows) * 100)
      : 0
    : 0;

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
          Upload multiple products at once via CSV or JSON — supports up to 200K products
        </p>
      </div>

      {/* Active job progress */}
      {activeJob && (
        <div className={`mb-6 p-5 rounded-2xl border ${
          activeJob.status === "completed" ? "bg-emerald-50 border-emerald-200" :
          activeJob.status === "failed" ? "bg-red-50 border-red-200" :
          "bg-blue-50 border-blue-200"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {activeJob.status === "processing" && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
              {activeJob.status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {activeJob.status === "failed" && <AlertCircle className="h-5 w-5 text-red-600" />}
              {activeJob.status === "pending" && <Clock className="h-5 w-5 text-amber-600" />}
              <span className="font-semibold text-gray-900">
                {activeJob.status === "processing" ? "Processing upload..." :
                 activeJob.status === "completed" ? "Upload complete" :
                 activeJob.status === "failed" ? "Upload failed" : "Queued for processing"}
              </span>
            </div>
            <span className="text-sm text-gray-600">{activeJob.fileName}</span>
          </div>

          {(activeJob.status === "processing" || activeJob.status === "completed") && (
            <>
              <div className="w-full bg-white/60 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    activeJob.status === "completed" ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {formatNumber(activeJob.processedRows)} / {formatNumber(activeJob.totalRows)} rows processed
                </span>
                <span className="font-medium text-gray-900">{progressPercent}%</span>
              </div>
            </>
          )}

          {(activeJob.status === "completed" || activeJob.status === "failed") && (
            <div className="mt-3 pt-3 border-t border-gray-200/50 space-y-1">
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-700">
                  {formatNumber(activeJob.createdCount)} created
                </span>
                {activeJob.errorCount > 0 && (
                  <span className="text-red-600">
                    {formatNumber(activeJob.errorCount)} errors
                  </span>
                )}
              </div>
              {activeJob.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-red-600 cursor-pointer hover:text-red-700">
                    View errors ({activeJob.errors.length}{activeJob.errors.length >= 1000 ? "+" : ""})
                  </summary>
                  <div className="mt-2 max-h-40 overflow-auto rounded-lg bg-white/60 p-3 text-xs space-y-1">
                    {activeJob.errors.slice(0, 100).map((err, i) => (
                      <p key={i} className="text-red-700">
                        Row {err.row}: {err.error}
                      </p>
                    ))}
                    {activeJob.errors.length > 100 && (
                      <p className="text-gray-500 pt-1">...and {activeJob.errors.length - 100} more</p>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Small batch result */}
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
                <div>
                  <p className="text-sm font-medium text-gray-900">{fileName}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatFileSize(fileSize)}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-600">
                    Click to select a CSV file
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports up to 200,000 products per upload
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Paste a JSON array of products (max {SMALL_BATCH_LIMIT}):
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

        {/* Large file info + upload */}
        {isLargeFile && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    Large file detected — {formatNumber(largeFileRowCount)} products
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    This file will be processed in the background using our bulk pipeline.
                    You can track progress in real time and continue using the dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">
                {formatNumber(largeFileRowCount)} product{largeFileRowCount !== 1 ? "s" : ""} to upload
              </p>
              <button
                onClick={clearProducts}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>

            <button
              onClick={handleLargeUpload}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  Start Bulk Upload ({formatNumber(largeFileRowCount)} products)
                </>
              )}
            </button>
          </div>
        )}

        {/* Small batch preview + upload */}
        {products.length > 0 && !isLargeFile && (
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
              onClick={handleSmallUpload}
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

      {/* Batch job history */}
      {batchJobs.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowJobHistory(!showJobHistory)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-4"
          >
            <RotateCw className="h-4 w-4" />
            Bulk Upload History ({batchJobs.length})
          </button>

          {showJobHistory && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">File</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Products</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Created</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Errors</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batchJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setActiveJob(job); if (job.status === "processing" || job.status === "pending") pollJobStatus(job.id); }}
                    >
                      <td className="px-4 py-3 text-gray-900 truncate max-w-[180px]">{job.fileName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatNumber(job.totalRows)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatNumber(job.createdCount)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{job.errorCount > 0 ? formatNumber(job.errorCount) : "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
