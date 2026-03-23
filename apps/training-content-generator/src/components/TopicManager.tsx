import { useState } from "react";
import {
  Plus,
  X,
  Sparkles,
  Loader2,
  Hash,
  Pencil,
  Check,
  ImageIcon,
} from "lucide-react";
import type { TopicItem } from "../types";

interface TopicManagerProps {
  topics: TopicItem[];
  onTopicsChange: (topics: TopicItem[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  imagePreview: string | null;
}

export function TopicManager({
  topics,
  onTopicsChange,
  onGenerate,
  isGenerating,
  imagePreview,
}: TopicManagerProps) {
  const [newTopic, setNewTopic] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const addTopic = () => {
    const trimmed = newTopic.trim();
    if (!trimmed || topics.length >= 10) return;

    onTopicsChange([
      ...topics,
      { id: crypto.randomUUID(), text: trimmed },
    ]);
    setNewTopic("");
  };

  const removeTopic = (id: string) => {
    onTopicsChange(topics.filter((t) => t.id !== id));
  };

  const startEditing = (topic: TopicItem) => {
    setEditingId(topic.id);
    setEditText(topic.text);
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim()) return;
    onTopicsChange(
      topics.map((t) =>
        t.id === editingId ? { ...t, text: editText.trim() } : t
      )
    );
    setEditingId(null);
    setEditText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: "add" | "edit") => {
    if (e.key === "Enter") {
      e.preventDefault();
      action === "add" ? addTopic() : saveEdit();
    }
    if (e.key === "Escape" && action === "edit") {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {imagePreview && (
        <div className="glass-card p-4 flex items-center gap-4">
          <img
            src={imagePreview}
            alt="Source"
            className="w-20 h-20 rounded-lg object-cover"
          />
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ImageIcon className="w-4 h-4" />
            <span>Topics extracted from uploaded image</span>
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Hash className="w-5 h-5 text-violet-400" />
            Training Topics
          </h2>
          <span className="text-sm text-slate-400">
            {topics.length}/10 topics
          </span>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "add")}
            placeholder="Type a topic and press Enter..."
            disabled={topics.length >= 10}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-all disabled:opacity-50"
          />
          <button
            onClick={addTopic}
            disabled={!newTopic.trim() || topics.length >= 10}
            className="px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 hover:bg-blue-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {topics.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No topics yet. Add topics manually or upload an image above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center text-xs font-medium text-slate-300">
                  {index + 1}
                </span>

                {editingId === topic.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, "edit")}
                      autoFocus
                      className="flex-1 px-3 py-1 rounded-lg bg-white/10 border border-blue-400/30 text-white focus:outline-none text-sm"
                    />
                    <button
                      onClick={saveEdit}
                      className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-slate-200">{topic.text}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(topic)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-400 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeTopic(topic.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onGenerate}
        disabled={topics.length === 0 || isGenerating}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 font-semibold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Training Content...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Training Content
          </>
        )}
      </button>
    </div>
  );
}
