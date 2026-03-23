import { useEffect, useState } from "react";
import type { AuthUser, ContentModel, ContentEntry } from "../types";
import {
  fetchEntries,
  deleteEntry,
  publishEntry,
  unpublishEntry,
  archiveEntry,
} from "../utils/api";

const DEFAULT_LOCALE = "en-US";

interface EntryListProps {
  model: ContentModel;
  user: AuthUser;
  onCreateEntry: () => void;
  onEditEntry: (entry: ContentEntry) => void;
}

export default function EntryList({
  model,
  user,
  onCreateEntry,
  onEditEntry,
}: EntryListProps) {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updatingStateId, setUpdatingStateId] = useState<string | null>(null);

  const isWriter = user.role === "writer";
  const isApprover = user.role === "approver";

  const canEditEntry = (entry: ContentEntry) =>
    isWriter && (!entry.createdBy || entry.createdBy === user.id);

  const canDeleteEntry = (entry: ContentEntry) =>
    isWriter && (!entry.createdBy || entry.createdBy === user.id);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await fetchEntries(model.id);
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [model.id]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    setDeleting(id);
    try {
      await deleteEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleStateChange = async (
    entryId: string,
    action: "publish" | "unpublish" | "archive",
  ) => {
    setUpdatingStateId(entryId);
    try {
      const updated =
        action === "publish"
          ? await publishEntry(entryId)
          : action === "unpublish"
            ? await unpublishEntry(entryId)
            : await archiveEntry(entryId);

      setEntries((prev) =>
        prev.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } finally {
      setUpdatingStateId(null);
    }
  };

  const getPreviewValue = (entry: ContentEntry): string => {
    const firstTextField = model.fields.find(
      (f) => f.type === "text" || f.type === "textarea",
    );
    if (!firstTextField) return entry.id.slice(0, 8);
    const val = entry.values[firstTextField.slug];
    if (firstTextField.localizable) {
      return getLocalizedPreviewValue(val);
    }
    if (typeof val === "string") return val || "(empty)";
    return String(val ?? "(empty)");
  };

  const getSecondaryValue = (entry: ContentEntry): string | null => {
    const textFields = model.fields.filter(
      (f) => f.type === "text" || f.type === "textarea",
    );
    if (textFields.length < 2) return null;
    const val = entry.values[textFields[1].slug];
    if (textFields[1].localizable) {
      const preview = getLocalizedPreviewValue(val);
      return preview === "(empty)" ? null : preview;
    }
    if (typeof val === "string" && val.trim()) return val;
    return null;
  };

  const getLocalizedPreviewValue = (value: unknown): string => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return String(value ?? "(empty)");
    }

    const localeValues = value as Record<string, unknown>;
    const preferred =
      localeValues[DEFAULT_LOCALE] ??
      Object.values(localeValues).find(
        (localeValue) =>
          localeValue !== undefined &&
          localeValue !== null &&
          String(localeValue).trim() !== "",
      );

    if (typeof preferred === "string") {
      return preferred || "(empty)";
    }

    return String(preferred ?? "(empty)");
  };

  const statusBadge = (status: ContentEntry["status"]) => {
    if (status === "published") {
      return "bg-emerald-100 text-emerald-700";
    }
    if (status === "archived") {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-slate-100 text-slate-700";
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="animate-pulse text-slate-400">Loading entries...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{model.name}</h1>
          {model.description && (
            <p className="text-slate-500 mt-1">{model.description}</p>
          )}
          <p className="text-sm text-slate-400 mt-1">
            {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        {isWriter && (
          <button
            onClick={onCreateEntry}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center gap-2"
          >
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New Entry
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            No entries yet
          </h3>
          <p className="text-slate-500 mb-6">
            {isWriter
              ? `Create your first content entry for ${model.name}`
              : `No content entries for ${model.name} yet`}
          </p>
          {isWriter && (
            <button
              onClick={onCreateEntry}
              className="px-5 py-2.5 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition-colors"
            >
              Create First Entry
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">
                  {getPreviewValue(entry)}
                </p>
                {getSecondaryValue(entry) && (
                  <p className="text-sm text-slate-400 truncate mt-0.5">
                    {getSecondaryValue(entry)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${statusBadge(entry.status)}`}
                >
                  {entry.status[0].toUpperCase() + entry.status.slice(1)}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(entry.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {isApprover && entry.status !== "published" && (
                  <button
                    onClick={() => handleStateChange(entry.id, "publish")}
                    disabled={updatingStateId === entry.id || deleting === entry.id}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    title="Publish"
                  >
                    Publish
                  </button>
                )}
                {isApprover && entry.status !== "draft" && (
                  <button
                    onClick={() => handleStateChange(entry.id, "unpublish")}
                    disabled={updatingStateId === entry.id || deleting === entry.id}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    title="Unpublish"
                  >
                    Unpublish
                  </button>
                )}
                {isApprover && entry.status !== "archived" && (
                  <button
                    onClick={() => handleStateChange(entry.id, "archive")}
                    disabled={updatingStateId === entry.id || deleting === entry.id}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    title="Archive"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => onEditEntry(entry)}
                  disabled={updatingStateId === entry.id || deleting === entry.id}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                  title={canEditEntry(entry) ? "Edit" : "View"}
                >
                  {canEditEntry(entry) ? (
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
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  ) : (
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
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
                {canDeleteEntry(entry) && (
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete"
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
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
