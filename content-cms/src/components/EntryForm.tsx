import { useEffect, useMemo, useState } from "react";
import type {
  ContentModel,
  ContentEntry,
  FieldDefinition,
  EntrySaveAction,
  EntryVersion,
} from "../types";
import RichTextEditor from "./RichTextEditor";
import { fetchEntryVersions } from "../utils/api";
import { buildEntryDiff } from "../utils/diff";

interface EntryFormProps {
  model: ContentModel;
  initial?: ContentEntry;
  onSave: (
    values: Record<string, unknown>,
    action: EntrySaveAction,
  ) => Promise<void>;
  onCancel: () => void;
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const baseInput =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all";

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.name}`}
          className={baseInput}
        />
      );

    case "textarea":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.name}`}
          rows={4}
          className={`${baseInput} resize-y`}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder={field.placeholder || "0"}
          className={baseInput}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
        />
      );

    case "dropdown":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={baseInput}
        >
          <option value="">Select {field.name}...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "toggle":
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-violet-600 peer-focus:ring-4 peer-focus:ring-violet-100 transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          <span className="ml-3 text-sm text-slate-600">
            {value ? "On" : "Off"}
          </span>
        </label>
      );

    case "richtext":
      return (
        <RichTextEditor
          value={(value as string) ?? ""}
          onChange={(html) => onChange(html)}
          placeholder={field.placeholder || `Write ${field.name}...`}
        />
      );

    default:
      return null;
  }
}

export default function EntryForm({
  model,
  initial,
  onSave,
  onCancel,
}: EntryFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(
    initial?.values ?? {},
  );
  const [savingAction, setSavingAction] = useState<EntrySaveAction | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<EntryVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (!initial?.id) {
      setVersions([]);
      setSelectedVersionId(null);
      return;
    }

    let active = true;
    const loadVersions = async () => {
      try {
        setVersionsLoading(true);
        const data = await fetchEntryVersions(initial.id);
        if (!active) return;
        setVersions(data);
        setSelectedVersionId((prev) =>
          prev && data.some((version) => version.id === prev)
            ? prev
            : data[0]?.id ?? null,
        );
      } finally {
        if (active) setVersionsLoading(false);
      }
    };

    loadVersions();

    return () => {
      active = false;
    };
  }, [initial?.id]);

  const updateValue = (slug: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [slug]: val }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const field of model.fields) {
      if (!field.required) continue;
      const val = values[field.slug];
      if (val === undefined || val === null || val === "") {
        newErrors[field.slug] = `${field.name} is required`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (action: EntrySaveAction) => {
    if (!validate()) return;
    setSavingAction(action);
    try {
      await onSave(values, action);
    } finally {
      setSavingAction(null);
    }
  };

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? null,
    [selectedVersionId, versions],
  );

  const fieldLabelBySlug = useMemo(
    () =>
      Object.fromEntries(model.fields.map((field) => [field.slug, field.name])),
    [model.fields],
  );

  const diffs = useMemo(() => {
    if (!selectedVersion) return [];
    return buildEntryDiff(
      selectedVersion.values,
      values,
      model.fields.map((field) => field.slug),
    );
  }, [model.fields, selectedVersion, values]);

  const hasUnsavedChanges =
    initial !== undefined &&
    JSON.stringify(initial.values) !== JSON.stringify(values);

  const statusLabel =
    hasUnsavedChanges || initial?.status === "draft"
      ? "Draft"
      : initial?.status === "published"
      ? "Published"
      : initial?.status === "archived"
        ? "Archived"
        : "Draft";

  const isSaving = savingAction !== null;
  const publishLabel = isSaving
    ? savingAction === "publish"
      ? "Publishing..."
      : "Publish"
    : "Publish";
  const draftLabel = isSaving
    ? savingAction === "save-draft"
      ? "Saving..."
      : initial
        ? "Update Draft"
        : "Save Draft"
    : initial
      ? "Update Draft"
      : "Save Draft";

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">
            {initial ? "Edit Entry" : `New ${model.name}`}
          </h1>
          {initial && (
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                hasUnsavedChanges || initial.status === "draft"
                  ? "bg-slate-100 text-slate-700"
                  : initial.status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : initial.status === "archived"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-700"
              }`}
            >
              {statusLabel}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSubmit("save-draft")}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {draftLabel}
          </button>
          <button
            onClick={() => handleSubmit("publish")}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishLabel}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] gap-6 items-start">
        <div className="space-y-6">
          {model.fields.map((field) => (
            <div
              key={field.id}
              className="bg-white rounded-2xl border border-slate-200 p-5"
            >
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {field.name}
                {field.required && <span className="text-red-400 ml-1">*</span>}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {field.type}
                </span>
              </label>
              <FieldRenderer
                field={field}
                value={values[field.slug]}
                onChange={(val) => updateValue(field.slug, val)}
              />
              {errors[field.slug] && (
                <p className="mt-1.5 text-sm text-red-500">
                  {errors[field.slug]}
                </p>
              )}
            </div>
          ))}
        </div>

        <aside className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-20">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            Version History
          </h2>

          {!initial && (
            <p className="text-sm text-slate-500">
              Publish this entry to start tracking versions.
            </p>
          )}

          {initial && versionsLoading && (
            <p className="text-sm text-slate-400">Loading versions...</p>
          )}

          {initial && !versionsLoading && versions.length === 0 && (
            <p className="text-sm text-slate-500">
              No versions yet. Click Publish to create version 1.
            </p>
          )}

          {initial && versions.length > 0 && (
            <>
              <div className="space-y-2 mb-5 max-h-52 overflow-auto pr-1">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => setSelectedVersionId(version.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                      selectedVersionId === version.id
                        ? "border-violet-300 bg-violet-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-700">
                      Version {version.versionNumber}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(version.createdAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Compare Selected Version With Current
                </h3>
                {selectedVersion && diffs.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No changes between selected version and current values.
                  </p>
                )}
                {selectedVersion && diffs.length > 0 && (
                  <div className="space-y-3 max-h-[28rem] overflow-auto pr-1">
                    {diffs.map((diff) => (
                      <div
                        key={diff.field}
                        className="rounded-xl border border-slate-200 overflow-hidden"
                      >
                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                          @@ {fieldLabelBySlug[diff.field] ?? diff.field}
                        </div>
                        <pre className="text-xs leading-5 p-3 overflow-x-auto bg-slate-950 text-slate-100">
                          <code>
                            {diff.lines.map((line, idx) => {
                              const prefix =
                                line.type === "add"
                                  ? "+"
                                  : line.type === "remove"
                                    ? "-"
                                    : " ";
                              const lineClass =
                                line.type === "add"
                                  ? "text-emerald-300"
                                  : line.type === "remove"
                                    ? "text-rose-300"
                                    : "text-slate-300";

                              return (
                                <span
                                  key={`${diff.field}-${idx}`}
                                  className={`block ${lineClass}`}
                                >
                                  {prefix}
                                  {line.text || " "}
                                </span>
                              );
                            })}
                          </code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
