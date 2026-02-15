import React, { useState } from "react";
import { MergeResult } from "../types";
import { downloadMergedCSV } from "../api";
import {
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Hash,
  Calendar,
  ToggleLeft,
  Type,
  Loader,
} from "lucide-react";

interface ResultViewProps {
  result: MergeResult;
  sessionId: string;
  onReset: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  number: <Hash size={12} />,
  date: <Calendar size={12} />,
  boolean: <ToggleLeft size={12} />,
  string: <Type size={12} />,
};

const typeColors: Record<string, string> = {
  number: "badge--blue",
  date: "badge--purple",
  boolean: "badge--amber",
  string: "badge--gray",
};

export function ResultView({ result, sessionId, onReset }: ResultViewProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadMergedCSV(sessionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "merged_output.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab if blob download fails
      alert("Download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const hasUnmatched = Object.keys(result.unmatchedKeys).length > 0;
  const previewRows = result.previewRows;
  const displayRows = previewRows.slice(0, 50);

  // Build ordered normalized keys matching mergedHeaders
  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  orderedKeys.push(result.commonKey);
  seen.add(result.commonKey);
  for (const analysis of result.fileAnalyses) {
    for (const col of analysis.columns) {
      if (!seen.has(col.name)) {
        orderedKeys.push(col.name);
        seen.add(col.name);
      }
    }
  }

  return (
    <div className="result-section">
      <div className="result-header">
        <div className="result-header__left">
          <CheckCircle2 size={28} className="success-icon" />
          <div>
            <h2 className="section-title">Merge Complete</h2>
            <p className="section-subtitle">
              {result.totalRows.toLocaleString()} rows merged from{" "}
              {result.fileAnalyses.length} files using{" "}
              <strong>{result.commonKey}</strong> as the join key.
            </p>
          </div>
        </div>
        <div className="result-header__actions">
          <button className="btn btn--secondary" onClick={onReset}>
            <RotateCcw size={16} />
            Start Over
          </button>
          <button
            className="btn btn--primary"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader size={16} className="spin-icon" />
                Downloading...
              </>
            ) : (
              <>
                <Download size={16} />
                Download CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* Column type summary */}
      <div className="type-summary">
        <h3 className="type-summary__title">Column Transformations</h3>
        <div className="type-summary__chips">
          {result.mergedHeaders.map((header, i) => {
            const normalizedKey = orderedKeys[i];
            const colType = result.columnTypes[normalizedKey] ?? "string";
            return (
              <div key={i} className="type-chip">
                <span className="type-chip__name">{header}</span>
                <span className={`badge badge--sm ${typeColors[colType]}`}>
                  {typeIcons[colType]}
                  {colType}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unmatched keys warning */}
      {hasUnmatched && (
        <div className="alert alert--warning">
          <AlertTriangle size={18} />
          <div>
            <strong>Some records had partial matches:</strong>
            <ul className="unmatched-list">
              {Object.entries(result.unmatchedKeys).map(([file, keys]) => (
                <li key={file}>
                  <strong>{file}</strong> was missing keys:{" "}
                  {keys.slice(0, 5).join(", ")}
                  {keys.length > 5 && ` and ${keys.length - 5} more`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Data preview table */}
      <div className="preview-table-wrap">
        <div className="preview-table-header">
          <h3>Data Preview</h3>
          {result.totalRows > 50 && (
            <span className="preview-note">
              Showing first 50 of {result.totalRows.toLocaleString()} rows
            </span>
          )}
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="row-num">#</th>
                {result.mergedHeaders.map((header, i) => (
                  <th key={i}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  <td className="row-num">{rowIdx + 1}</td>
                  {orderedKeys.map((key, colIdx) => {
                    const val = row[key];
                    const display =
                      val === null || val === undefined || val === ""
                        ? "\u2014"
                        : String(val);
                    const colType = result.columnTypes[key] ?? "string";
                    return (
                      <td
                        key={colIdx}
                        className={
                          colType === "number" ? "text-right" : ""
                        }
                      >
                        <span className={display === "\u2014" ? "empty-val" : ""}>
                          {display}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download button bottom */}
      <div className="result-footer">
        <button
          className="btn btn--primary btn--large"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <Loader size={20} className="spin-icon" />
              Downloading...
            </>
          ) : (
            <>
              <Download size={20} />
              Download Merged CSV
            </>
          )}
        </button>
      </div>
    </div>
  );
}
