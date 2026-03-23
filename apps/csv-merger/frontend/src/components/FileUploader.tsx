import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, AlertCircle, Info } from "lucide-react";
import React from "react";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB — matches backend limit
const MAX_FILES = 10;

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
}

export function FileUploader({ onFilesSelected, isUploading }: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFiles = (newFiles: File[]): File[] => {
    const warnings: string[] = [];

    // Filter to CSV only
    const csvFiles = newFiles.filter(
      (f) => f.name.endsWith(".csv") || f.type === "text/csv"
    );
    if (csvFiles.length !== newFiles.length) {
      warnings.push("Some files were skipped — only CSV files are accepted.");
    }

    // Filter by size
    const sizeOk = csvFiles.filter((f) => f.size <= MAX_FILE_SIZE);
    if (sizeOk.length !== csvFiles.length) {
      const oversized = csvFiles.filter((f) => f.size > MAX_FILE_SIZE);
      warnings.push(
        `${oversized.map((f) => f.name).join(", ")} exceeded the 50 MB limit and ${
          oversized.length === 1 ? "was" : "were"
        } removed.`
      );
    }

    // Enforce max file count
    if (files.length + sizeOk.length > MAX_FILES) {
      const allowed = MAX_FILES - files.length;
      warnings.push(
        `Maximum ${MAX_FILES} files allowed. Only the first ${allowed} new file(s) were added.`
      );
      const trimmed = sizeOk.slice(0, Math.max(0, allowed));
      setError(warnings.join(" "));
      return trimmed;
    }

    if (warnings.length > 0) {
      setError(warnings.join(" "));
    } else {
      setError(null);
    }

    return sizeOk;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      const valid = validateFiles(droppedFiles);
      setFiles((prev) => [...prev, ...valid]);
    },
    [files.length]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const valid = validateFiles(selected);
      setFiles((prev) => [...prev, ...valid]);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleUpload = () => {
    if (files.length < 2) {
      setError("Please add at least 2 CSV files to merge.");
      return;
    }
    setError(null);
    onFilesSelected(files);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="upload-section">
      <div
        className={`drop-zone ${dragActive ? "drop-zone--active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-zone__icon">
          <Upload size={48} strokeWidth={1.5} />
        </div>
        <h3 className="drop-zone__title">
          Drop your CSV files here
        </h3>
        <p className="drop-zone__subtitle">
          or click to browse from your computer
        </p>
        <input
          type="file"
          multiple
          accept=".csv,text/csv"
          onChange={handleFileInput}
          className="drop-zone__input"
        />
        <button className="btn btn--secondary" onClick={() => {
          const input = document.querySelector<HTMLInputElement>('.drop-zone__input');
          input?.click();
        }}>
          Browse Files
        </button>
      </div>

      {/* Limits info */}
      <div className="alert alert--info">
        <Info size={16} />
        <span>
          Up to {MAX_FILES} files, 50 MB each, max 100,000 rows per file.
        </span>
      </div>

      {error && (
        <div className="alert alert--error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="file-list">
          <h4 className="file-list__title">
            Selected Files ({files.length})
          </h4>
          <div className="file-list__items">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="file-item">
                <div className="file-item__info">
                  <FileSpreadsheet size={20} className="file-item__icon" />
                  <div>
                    <span className="file-item__name">{file.name}</span>
                    <span className="file-item__size">{formatSize(file.size)}</span>
                  </div>
                </div>
                <button
                  className="file-item__remove"
                  onClick={() => removeFile(index)}
                  aria-label="Remove file"
                  disabled={isUploading}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          <button
            className="btn btn--primary btn--full"
            onClick={handleUpload}
            disabled={isUploading || files.length < 2}
          >
            {isUploading ? (
              <>
                <span className="spinner" />
                Analyzing Files...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload & Analyze ({files.length} files)
              </>
            )}
          </button>

          {files.length < 2 && (
            <p className="hint">Add at least 2 CSV files to proceed</p>
          )}
        </div>
      )}
    </div>
  );
}
