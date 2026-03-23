import { useState, type DragEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import type { ContentModel, FieldDefinition, FieldType } from "../types";
import { FIELD_TYPE_META } from "../types";

interface ModelBuilderProps {
  initial?: ContentModel;
  onSave: (data: {
    name: string;
    description: string;
    fields: FieldDefinition[];
  }) => Promise<void>;
  onCancel: () => void;
}

const FIELD_TYPES = Object.keys(FIELD_TYPE_META) as FieldType[];
const LOCALIZABLE_FIELD_TYPES: FieldType[] = ["text", "textarea", "richtext"];
const FIELD_TYPE_DRAG_MIME = "application/x-content-model-field-type";
const FIELD_INDEX_DRAG_MIME = "application/x-content-model-field-index";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function createField(
  type: FieldType,
  overrides: Partial<FieldDefinition> = {},
): FieldDefinition {
  return {
    id: uuidv4(),
    name: "",
    slug: "",
    type,
    required: false,
    localizable: false,
    placeholder: "",
    options: type === "dropdown" ? ["Option 1", "Option 2"] : undefined,
    ...overrides,
  };
}

function createDefaultTitleField(): FieldDefinition {
  return createField("text", {
    name: "Title",
    slug: "title",
    required: true,
    placeholder: "Enter title",
  });
}

function getInitialFields(initial?: ContentModel): FieldDefinition[] {
  if (initial?.fields?.length) {
    return initial.fields;
  }

  return [createDefaultTitleField()];
}

function renderFieldPreview(field: FieldDefinition) {
  const label = field.name || FIELD_TYPE_META[field.type].label;
  const placeholder = field.placeholder || `Enter ${label.toLowerCase()}`;

  if (field.type === "textarea") {
    return (
      <textarea
        disabled
        rows={3}
        placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
      />
    );
  }

  if (field.type === "richtext") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs text-slate-400">
          <span className="font-semibold">B</span>
          <span className="italic">I</span>
          <span className="underline">U</span>
          <span>List</span>
        </div>
        <div className="px-4 py-5 text-sm text-slate-400">{placeholder}</div>
      </div>
    );
  }

  if (field.type === "dropdown") {
    return (
      <div className="relative">
        <select
          disabled
          className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
          value=""
        >
          <option value="">{field.options?.[0] ?? "Select an option"}</option>
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
          ▾
        </span>
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-sm text-slate-500">{placeholder}</span>
        <span className="flex h-6 w-11 items-center rounded-full bg-slate-200 px-1">
          <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
        </span>
      </div>
    );
  }

  return (
    <input
      disabled
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
    />
  );
}

export default function ModelBuilder({
  initial,
  onSave,
  onCancel,
}: ModelBuilderProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [initialFields] = useState<FieldDefinition[]>(() => getInitialFields(initial));
  const [fields, setFields] = useState<FieldDefinition[]>(initialFields);
  const [saving, setSaving] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(
    initialFields[0]?.id ?? null,
  );
  const [activeDropIndex, setActiveDropIndex] = useState<number | null>(null);

  const supportsLocalization = (type: FieldType) =>
    LOCALIZABLE_FIELD_TYPES.includes(type);

  const insertField = (type: FieldType, index = fields.length) => {
    const newField = createField(type);
    setFields((prev) => {
      const updated = [...prev];
      updated.splice(index, 0, newField);
      return updated;
    });
    setEditingFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FieldDefinition>) => {
    setFields((prev) =>
      prev.map((field) => {
        if (field.id !== id) return field;
        const updated = { ...field, ...updates };
        if (updates.name !== undefined) {
          updated.slug = slugify(updates.name);
        }
        return updated;
      }),
    );
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((field) => field.id !== id));
    if (editingFieldId === id) {
      const nextField = fields.find((field) => field.id !== id);
      setEditingFieldId(nextField?.id ?? null);
    }
  };

  const moveField = (from: number, to: number) => {
    if (from === to || from + 1 === to) {
      return;
    }

    setFields((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      const nextIndex = from < to ? to - 1 : to;
      updated.splice(nextIndex, 0, moved);
      return updated;
    });
  };

  const handlePaletteDragStart = (
    event: DragEvent<HTMLElement>,
    type: FieldType,
  ) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(FIELD_TYPE_DRAG_MIME, type);
  };

  const handleFieldDragStart = (
    event: DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(FIELD_INDEX_DRAG_MIME, String(index));
  };

  const handleDropZoneDragOver = (
    event: DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    event.preventDefault();
    setActiveDropIndex(index);
  };

  const handleDropZoneDrop = (
    event: DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    event.preventDefault();

    const type = event.dataTransfer.getData(FIELD_TYPE_DRAG_MIME) as FieldType;
    const draggedIndex = event.dataTransfer.getData(FIELD_INDEX_DRAG_MIME);

    if (type) {
      insertField(type, index);
    } else if (draggedIndex) {
      moveField(Number(draggedIndex), index);
    }

    setActiveDropIndex(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (fields.some((field) => !field.name.trim())) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        fields,
      });
    } finally {
      setSaving(false);
    }
  };

  const isValid =
    name.trim().length > 0 &&
    fields.length > 0 &&
    fields.every((field) => field.name.trim().length > 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {initial ? "Edit Model" : "Create Content Model"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Build the content structure by dragging field types into the form
            canvas.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-sm font-medium text-white transition-all hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : initial ? "Update Model" : "Create Model"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Field Library
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Drag a field onto the form canvas, or click to add it instantly.
            </p>

            <div className="mt-5 space-y-3">
              {FIELD_TYPES.map((type) => {
                const meta = FIELD_TYPE_META[type];

                return (
                  <button
                    key={type}
                    type="button"
                    draggable
                    onClick={() => insertField(type)}
                    onDragStart={(event) => handlePaletteDragStart(event, type)}
                    className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition-all hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-base text-slate-700 shadow-sm">
                      {meta.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-700">
                          {meta.label}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Drag
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {meta.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              Model Details
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">
                  Model Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Blog Post"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 transition-all focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                {name && (
                  <p className="mt-1 text-xs text-slate-400">Slug: {slugify(name)}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-600">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe this content type"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 transition-all focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  Form Canvas
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Title starts as a default text field. Drag more fields in to
                  define the full content model.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                {fields.length} field{fields.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4">
              <div
                onDragOver={(event) => handleDropZoneDragOver(event, 0)}
                onDrop={(event) => handleDropZoneDrop(event, 0)}
                onDragLeave={() => setActiveDropIndex(null)}
                className={`mb-3 rounded-xl border-2 border-dashed px-4 py-3 text-center text-sm transition-all ${
                  activeDropIndex === 0
                    ? "border-violet-300 bg-violet-50 text-violet-700"
                    : "border-transparent text-slate-400"
                }`}
              >
                Drop a field here
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-3">
                    <div
                      draggable
                      onDragStart={(event) => handleFieldDragStart(event, index)}
                      onDragEnd={() => setActiveDropIndex(null)}
                      className={`rounded-2xl border bg-white transition-all ${
                        editingFieldId === field.id
                          ? "border-violet-300 shadow-sm ring-2 ring-violet-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className="flex cursor-pointer items-start gap-3 px-5 py-4"
                        onClick={() =>
                          setEditingFieldId(
                            editingFieldId === field.id ? null : field.id,
                          )
                        }
                      >
                        <span className="cursor-grab pt-1 text-slate-300 hover:text-slate-500">
                          <svg
                            className="h-5 w-5"
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

                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm">
                          {FIELD_TYPE_META[field.type].icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-700">
                              {field.name || (
                                <span className="italic text-slate-400">
                                  Unnamed field
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-slate-400">
                              {FIELD_TYPE_META[field.type].label}
                            </span>
                            {field.required && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                                Required
                              </span>
                            )}
                            {field.localizable && (
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                                Localized
                              </span>
                            )}
                          </div>

                          <div className="mt-4">
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                              {field.name || FIELD_TYPE_META[field.type].label}
                              {field.required && (
                                <span className="ml-1 text-red-400">*</span>
                              )}
                            </label>
                            {renderFieldPreview(field)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeField(field.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <svg
                            className="h-4 w-4"
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
                        <div className="border-t border-slate-100 px-5 pb-5 pt-1">
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-slate-600">
                                Field Name <span className="text-red-400">*</span>
                              </label>
                              <input
                                type="text"
                                value={field.name}
                                onChange={(event) =>
                                  updateField(field.id, {
                                    name: event.target.value,
                                  })
                                }
                                placeholder="e.g. Title"
                                autoFocus
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                              />
                              {field.name && (
                                <p className="mt-1 text-xs text-slate-400">
                                  Slug: {field.slug}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="mb-1 block text-sm font-medium text-slate-600">
                                Placeholder
                              </label>
                              <input
                                type="text"
                                value={field.placeholder ?? ""}
                                onChange={(event) =>
                                  updateField(field.id, {
                                    placeholder: event.target.value,
                                  })
                                }
                                placeholder="Placeholder text"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-3">
                            <label className="flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(event) =>
                                  updateField(field.id, {
                                    required: event.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                              />
                              <span className="text-sm text-slate-600">
                                Required field
                              </span>
                            </label>
                          </div>

                          {supportsLocalization(field.type) && (
                            <>
                              <div className="mt-3 flex items-center gap-3">
                                <label className="flex cursor-pointer items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(field.localizable)}
                                    onChange={(event) =>
                                      updateField(field.id, {
                                        localizable: event.target.checked,
                                      })
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                  />
                                  <span className="text-sm text-slate-600">
                                    Enable localization for this field
                                  </span>
                                </label>
                              </div>

                              <p className="mt-2 text-xs text-slate-400">
                                Localized fields store separate values per enabled
                                account locale.
                              </p>
                            </>
                          )}

                          {field.type === "dropdown" && (
                            <div className="mt-4">
                              <label className="mb-2 block text-sm font-medium text-slate-600">
                                Options
                              </label>
                              <div className="space-y-2">
                                {(field.options ?? []).map((option, optionIndex) => (
                                  <div
                                    key={optionIndex}
                                    className="flex items-center gap-2"
                                  >
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(event) => {
                                        const nextOptions = [...(field.options ?? [])];
                                        nextOptions[optionIndex] = event.target.value;
                                        updateField(field.id, {
                                          options: nextOptions,
                                        });
                                      }}
                                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextOptions = (
                                          field.options ?? []
                                        ).filter((_, indexToKeep) => indexToKeep !== optionIndex);
                                        updateField(field.id, {
                                          options: nextOptions,
                                        });
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-500"
                                    >
                                      <svg
                                        className="h-4 w-4"
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
                                  type="button"
                                  onClick={() =>
                                    updateField(field.id, {
                                      options: [
                                        ...(field.options ?? []),
                                        `Option ${(field.options?.length ?? 0) + 1}`,
                                      ],
                                    })
                                  }
                                  className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
                                >
                                  <svg
                                    className="h-4 w-4"
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

                    <div
                      onDragOver={(event) => handleDropZoneDragOver(event, index + 1)}
                      onDrop={(event) => handleDropZoneDrop(event, index + 1)}
                      onDragLeave={() => setActiveDropIndex(null)}
                      className={`rounded-xl border-2 border-dashed px-4 py-3 text-center text-sm transition-all ${
                        activeDropIndex === index + 1
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-transparent text-slate-400"
                      }`}
                    >
                      Drop a field here
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
