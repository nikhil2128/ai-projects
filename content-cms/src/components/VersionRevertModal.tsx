import { useEffect, useMemo, useState } from "react";
import type { FieldDefinition } from "../types";

interface VersionRevertModalProps {
  fields: FieldDefinition[];
  previousValues: Record<string, unknown>;
  currentValues: Record<string, unknown>;
  versionNumber: number;
  onApply: (revertedValues: Record<string, unknown>) => void;
  onClose: () => void;
}

function formatFieldValue(
  value: unknown,
  field: FieldDefinition,
): string {
  if (value === undefined || value === null || value === "") return "—";

  if (field.type === "toggle") return value ? "On" : "Off";

  if (field.type === "richtext") {
    const text = String(value)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text || "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function isValueDifferent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

export default function VersionRevertModal({
  fields,
  previousValues,
  currentValues,
  versionNumber,
  onApply,
  onClose,
}: VersionRevertModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const changedFields = useMemo(
    () =>
      fields.filter((f) =>
        isValueDifferent(previousValues[f.slug], currentValues[f.slug]),
      ),
    [fields, previousValues, currentValues],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleField = (slug: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedFields.size === changedFields.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(changedFields.map((f) => f.slug)));
    }
  };

  const handleApply = () => {
    const merged: Record<string, unknown> = { ...currentValues };
    for (const slug of selectedFields) {
      merged[slug] = previousValues[slug];
    }
    onApply(merged);
  };

  const allSelected =
    changedFields.length > 0 && selectedFields.size === changedFields.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Revert Fields from Version {versionNumber}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Select fields to revert to their previous version values
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_1fr] border-b border-slate-200 bg-slate-50/50">
          <div className="px-4 py-2.5 flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30 cursor-pointer"
              title="Select all changed fields"
            />
          </div>
          <div className="px-4 py-2.5 border-l border-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Version {versionNumber} (Previous)
            </span>
          </div>
          <div className="px-4 py-2.5 border-l border-slate-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Current
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {fields.map((field) => {
            const prevVal = previousValues[field.slug];
            const currVal = currentValues[field.slug];
            const changed = isValueDifferent(prevVal, currVal);
            const checked = selectedFields.has(field.slug);

            return (
              <div
                key={field.slug}
                className={`grid grid-cols-[auto_1fr_1fr] border-b border-slate-100 last:border-b-0 transition-colors ${
                  checked
                    ? "bg-violet-50/60"
                    : changed
                      ? "bg-white hover:bg-slate-50/60"
                      : "bg-slate-50/30"
                }`}
              >
                {/* Checkbox */}
                <div className="px-4 py-4 flex items-start pt-5">
                  {changed ? (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleField(field.slug)}
                      className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30 cursor-pointer"
                    />
                  ) : (
                    <div className="w-4 h-4" />
                  )}
                </div>

                {/* Previous value */}
                <div
                  className={`px-4 py-4 border-l ${
                    checked
                      ? "border-violet-200"
                      : changed
                        ? "border-slate-200"
                        : "border-slate-100"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-2">
                    {field.name}
                    {changed && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </p>
                  <div
                    className={`text-sm whitespace-pre-wrap break-words rounded-lg px-3 py-2 ${
                      checked
                        ? "bg-violet-100/80 text-violet-900 ring-2 ring-violet-300"
                        : changed
                          ? "bg-amber-50 text-slate-800"
                          : "bg-slate-100/60 text-slate-500"
                    }`}
                  >
                    {formatFieldValue(prevVal, field)}
                  </div>
                </div>

                {/* Current value */}
                <div
                  className={`px-4 py-4 border-l ${
                    checked
                      ? "border-violet-200"
                      : changed
                        ? "border-slate-200"
                        : "border-slate-100"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-500 mb-1.5">
                    {field.name}
                  </p>
                  <div
                    className={`text-sm whitespace-pre-wrap break-words rounded-lg px-3 py-2 ${
                      checked
                        ? "bg-slate-100/60 text-slate-400 line-through decoration-slate-300"
                        : changed
                          ? "bg-blue-50 text-slate-800"
                          : "bg-slate-100/60 text-slate-500"
                    }`}
                  >
                    {formatFieldValue(currVal, field)}
                  </div>
                </div>
              </div>
            );
          })}

          {changedFields.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm">
                No differences between version {versionNumber} and current
                values.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/80">
          <p className="text-sm text-slate-500">
            {selectedFields.size > 0 ? (
              <>
                <span className="font-medium text-violet-700">
                  {selectedFields.size}
                </span>{" "}
                {selectedFields.size === 1 ? "field" : "fields"} selected for
                revert
              </>
            ) : (
              "Select fields to revert"
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedFields.size === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
