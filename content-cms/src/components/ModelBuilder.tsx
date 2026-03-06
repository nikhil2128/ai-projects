import { useState } from "react";
import type { ContentModel, FieldDefinition, FieldType } from "../types";
import { FIELD_TYPE_META } from "../types";
import { v4 as uuidv4 } from "uuid";

interface ModelBuilderProps {
  initial?: ContentModel;
  onSave: (data: {
    name: string;
    description: string;
    fields: FieldDefinition[];
  }) => Promise<void>;
  onCancel: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

const FIELD_TYPES = Object.keys(FIELD_TYPE_META) as FieldType[];

export default function ModelBuilder({
  initial,
  onSave,
  onCancel,
}: ModelBuilderProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [fields, setFields] = useState<FieldDefinition[]>(
    initial?.fields ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const addField = (type: FieldType) => {
    const newField: FieldDefinition = {
      id: uuidv4(),
      name: "",
      slug: "",
      type,
      required: false,
      placeholder: "",
      options: type === "dropdown" ? ["Option 1", "Option 2"] : undefined,
    };
    setFields((prev) => [...prev, newField]);
    setEditingFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FieldDefinition>) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };
        if (updates.name !== undefined) {
          updated.slug = slugify(updates.name);
        }
        return updated;
      }),
    );
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (editingFieldId === id) setEditingFieldId(null);
  };

  const moveField = (from: number, to: number) => {
    setFields((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== idx) {
      moveField(dragIdx, idx);
      setDragIdx(idx);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (fields.some((f) => !f.name.trim())) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), fields });
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    name.trim().length > 0 &&
    fields.length > 0 &&
    fields.every((f) => f.name.trim().length > 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          {initial ? "Edit Model" : "Create Content Model"}
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
            disabled={!isValid || saving}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : initial ? "Update Model" : "Create Model"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
            Model Details
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Model Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blog Post"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
              {name && (
                <p className="text-xs text-slate-400 mt-1">
                  Slug: {slugify(name)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this content type"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
            Add Fields
          </h2>
          <div className="flex flex-wrap gap-2">
            {FIELD_TYPES.map((type) => {
              const meta = FIELD_TYPE_META[type];
              return (
                <button
                  key={type}
                  onClick={() => addField(type)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all"
                >
                  <span className="text-base leading-none">{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {fields.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
              Fields ({fields.length})
            </h2>
            {fields.map((field, idx) => (
              <div
                key={field.id}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={() => setDragIdx(null)}
                className={`bg-white rounded-2xl border transition-all ${
                  editingFieldId === field.id
                    ? "border-violet-300 shadow-sm ring-2 ring-violet-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer"
                  onClick={() =>
                    setEditingFieldId(
                      editingFieldId === field.id ? null : field.id,
                    )
                  }
                >
                  <span className="cursor-grab text-slate-300 hover:text-slate-500">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 9h16.5m-16.5 6.75h16.5"
                      />
                    </svg>
                  </span>

                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm shrink-0">
                    {FIELD_TYPE_META[field.type].icon}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-700">
                      {field.name || (
                        <span className="text-slate-400 italic">
                          Unnamed field
                        </span>
                      )}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {FIELD_TYPE_META[field.type].label}
                    </span>
                  </div>

                  {field.required && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Required
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(field.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {editingFieldId === field.id && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                    <div className="grid gap-4 sm:grid-cols-2 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Field Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) =>
                            updateField(field.id, { name: e.target.value })
                          }
                          placeholder="e.g. Title"
                          autoFocus
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                        />
                        {field.name && (
                          <p className="text-xs text-slate-400 mt-1">
                            Slug: {field.slug}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={field.placeholder ?? ""}
                          onChange={(e) =>
                            updateField(field.id, {
                              placeholder: e.target.value,
                            })
                          }
                          placeholder="Placeholder text"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(field.id, {
                              required: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-600">
                          Required field
                        </span>
                      </label>
                    </div>

                    {field.type === "dropdown" && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-600 mb-2">
                          Options
                        </label>
                        <div className="space-y-2">
                          {(field.options ?? []).map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOptions = [
                                    ...(field.options ?? []),
                                  ];
                                  newOptions[optIdx] = e.target.value;
                                  updateField(field.id, {
                                    options: newOptions,
                                  });
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                              />
                              <button
                                onClick={() => {
                                  const newOptions = (
                                    field.options ?? []
                                  ).filter((_, i) => i !== optIdx);
                                  updateField(field.id, {
                                    options: newOptions,
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-red-500"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              updateField(field.id, {
                                options: [
                                  ...(field.options ?? []),
                                  `Option ${(field.options?.length ?? 0) + 1}`,
                                ],
                              })
                            }
                            className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                            Add option
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
