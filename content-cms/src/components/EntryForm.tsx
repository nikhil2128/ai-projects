import { useState } from "react";
import type { ContentModel, ContentEntry, FieldDefinition } from "../types";
import RichTextEditor from "./RichTextEditor";

interface EntryFormProps {
  model: ContentModel;
  initial?: ContentEntry;
  onSave: (values: Record<string, unknown>) => Promise<void>;
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
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          {initial ? "Edit Entry" : `New ${model.name}`}
        </h1>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : initial
                ? "Update Entry"
                : "Create Entry"}
          </button>
        </div>
      </div>

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
    </div>
  );
}
