import { useEffect, useState } from "react";
import type { ContentModel } from "../types";
import { fetchModels, deleteModel } from "../utils/api";

interface ModelListProps {
  onCreateModel: () => void;
  onEditModel: (model: ContentModel) => void;
  onViewEntries: (model: ContentModel) => void;
}

export default function ModelList({
  onCreateModel,
  onEditModel,
  onViewEntries,
}: ModelListProps) {
  const [models, setModels] = useState<ContentModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await fetchModels();
      setModels(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this model and all its content entries?")) return;
    setDeleting(id);
    try {
      await deleteModel(id);
      setModels((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="animate-pulse text-slate-400">Loading models...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Content Models</h1>
          <p className="text-slate-500 mt-1">
            Define the structure of your content types
          </p>
        </div>
        <button
          onClick={onCreateModel}
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
          New Model
        </button>
      </div>

      {models.length === 0 ? (
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            No content models yet
          </h3>
          <p className="text-slate-500 mb-6">
            Create your first model to start managing content
          </p>
          <button
            onClick={onCreateModel}
            className="px-5 py-2.5 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            Create Your First Model
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-violet-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z"
                    />
                  </svg>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEditModel(model)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    title="Edit model"
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
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    disabled={deleting === model.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete model"
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
                </div>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                {model.name}
              </h3>
              {model.description && (
                <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                  {model.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  {model.fields.length} field
                  {model.fields.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => onViewEntries(model)}
                  className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
                >
                  View Entries
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
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
