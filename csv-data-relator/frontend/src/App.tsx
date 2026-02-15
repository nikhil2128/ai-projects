import { useMemo, useState } from "react";
import { FilePicker } from "./components/FilePicker";
import { ResultsTable } from "./components/ResultsTable";
import { MergeResponse } from "./types";

const API_BASE_URL = "http://localhost:4000";

const saveCsvFile = (csvText: string): void => {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "merged-output.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<MergeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(() => files.length, [files]);

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) {
      return;
    }

    const nextMap = new Map<string, File>();
    [...files, ...incoming].forEach((file) => {
      nextMap.set(file.name, file);
    });
    setFiles(Array.from(nextMap.values()));
  };

  const removeFile = (name: string) => {
    setFiles((current) => current.filter((item) => item.name !== name));
  };

  const handleMerge = async () => {
    if (!files.length) {
      setError("Please upload at least one CSV file.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));

      const response = await fetch(`${API_BASE_URL}/api/merge-csv`, {
        method: "POST",
        body: form,
      });

      const payload = (await response.json()) as MergeResponse | { error: string };
      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Unable to merge files.");
      }

      setResult(payload as MergeResponse);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unexpected merge error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout">
      <div className="container">
        <header>
          <h1>CSV Data Relator</h1>
          <p>
            Upload multiple CSVs, auto-detect column data types, merge rows by Employee ID, and
            export a single clean CSV.
          </p>
        </header>

        <FilePicker files={files} onFilesSelected={addFiles} onRemoveFile={removeFile} />

        <section className="card action-row">
          <p>{selectedCount} CSV file(s) selected.</p>
          <button type="button" onClick={handleMerge} disabled={loading}>
            {loading ? "Merging..." : "Merge Files"}
          </button>
        </section>

        {error && <section className="card error">{error}</section>}

        {result && (
          <>
            <section className="card success">
              <p>{result.message}</p>
              <button type="button" onClick={() => saveCsvFile(result.csvText)}>
                Download Merged CSV
              </button>
            </section>
            <ResultsTable headers={result.headers} rows={result.rows} />
          </>
        )}
      </div>
    </main>
  );
}

export default App;
