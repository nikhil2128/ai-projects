import React from "react";
import { FileAnalysis } from "../types";
import {
  FileSpreadsheet,
  Hash,
  Calendar,
  ToggleLeft,
  Type,
  Link,
  Merge,
} from "lucide-react";

interface AnalysisViewProps {
  files: FileAnalysis[];
  commonKey: string | null;
  onMerge: () => void;
  isMerging: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  number: <Hash size={14} />,
  date: <Calendar size={14} />,
  boolean: <ToggleLeft size={14} />,
  string: <Type size={14} />,
};

const typeColors: Record<string, string> = {
  number: "badge--blue",
  date: "badge--purple",
  boolean: "badge--amber",
  string: "badge--gray",
};

export function AnalysisView({
  files,
  commonKey,
  onMerge,
  isMerging,
}: AnalysisViewProps) {
  return (
    <div className="analysis-section">
      <div className="analysis-header">
        <h2 className="section-title">File Analysis</h2>
        <p className="section-subtitle">
          We analyzed your {files.length} files and detected the structure below.
        </p>
      </div>

      {commonKey && (
        <div className="common-key-banner">
          <Link size={18} />
          <span>
            Common key detected: <strong>{commonKey}</strong> — this column will
            be used to join all files together.
          </span>
        </div>
      )}

      <div className="analysis-cards">
        {files.map((file, idx) => (
          <div key={idx} className="analysis-card">
            <div className="analysis-card__header">
              <FileSpreadsheet size={20} />
              <div>
                <h3 className="analysis-card__title">{file.fileName}</h3>
                <span className="analysis-card__meta">
                  {file.rowCount} rows · {file.columns.length} columns
                </span>
              </div>
            </div>
            <div className="analysis-card__columns">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Column</th>
                    <th>Type</th>
                    <th>Unique</th>
                    <th>Empty</th>
                    <th>Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {file.columns.map((col, colIdx) => (
                    <tr
                      key={colIdx}
                      className={col.name === commonKey ? "row--highlight" : ""}
                    >
                      <td className="col-name">
                        {col.name === commonKey && (
                          <Link size={12} className="key-icon" />
                        )}
                        {col.originalName}
                      </td>
                      <td>
                        <span className={`badge ${typeColors[col.detectedType]}`}>
                          {typeIcons[col.detectedType]}
                          {col.detectedType}
                        </span>
                      </td>
                      <td className="text-center">{col.uniqueCount}</td>
                      <td className="text-center">{col.nullCount}</td>
                      <td className="sample-cell">
                        {col.sampleValues
                          .filter((v) => v.trim() !== "")
                          .slice(0, 2)
                          .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn--primary btn--large"
        onClick={onMerge}
        disabled={isMerging || !commonKey}
      >
        {isMerging ? (
          <>
            <span className="spinner" />
            Merging Files...
          </>
        ) : (
          <>
            <Merge size={20} />
            Merge Files
          </>
        )}
      </button>

      {!commonKey && (
        <div className="alert alert--error" style={{ marginTop: "1rem" }}>
          No common column was detected across all files. Ensure all files share
          at least one column (e.g., employee_id).
        </div>
      )}
    </div>
  );
}
