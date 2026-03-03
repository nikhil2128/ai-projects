import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

interface SaveDialogProps {
  onSave: (title: string) => void;
  onCancel: () => void;
}

export default function SaveDialog({ onSave, onCancel }: SaveDialogProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Save Org Chart
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          Give your chart a title to save it for later.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm text-slate-700">Title</span>
            <input
              autoFocus
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Engineering Team Q1"
            />
          </label>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
