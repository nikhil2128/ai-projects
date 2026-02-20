'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const EMOJI_LIST = ['❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '💯', '🎉', '😍'];

interface Props {
  postId: number;
  reactionCounts: Record<string, number>;
  userReactions: string[];
}

export default function EmojiReactions({
  postId,
  reactionCounts: initialCounts,
  userReactions: initialUserReactions,
}: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [userReactions, setUserReactions] = useState<string[]>(initialUserReactions);
  const [showPicker, setShowPicker] = useState(false);

  const toggleReaction = async (emoji: string) => {
    try {
      const res = await api.reactions.toggle(postId, emoji);

      setCounts((prev) => {
        const updated = { ...prev };
        if (res.action === 'added') {
          updated[emoji] = (updated[emoji] ?? 0) + 1;
        } else {
          updated[emoji] = Math.max((updated[emoji] ?? 1) - 1, 0);
          if (updated[emoji] === 0) delete updated[emoji];
        }
        return updated;
      });

      setUserReactions((prev) =>
        res.action === 'added'
          ? [...prev, emoji]
          : prev.filter((e) => e !== emoji),
      );
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const activeEmojis = Object.entries(counts).filter(([, count]) => count > 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeEmojis.map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => toggleReaction(emoji)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-all ${
            userReactions.includes(emoji)
              ? 'border-pink-300 bg-pink-50 text-pink-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          <span>{emoji}</span>
          <span className="text-xs font-medium">{count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
          title="Add reaction"
        >
          +
        </button>
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  toggleReaction(emoji);
                  setShowPicker(false);
                }}
                className={`rounded-lg p-1.5 text-lg transition-colors hover:bg-gray-100 ${
                  userReactions.includes(emoji) ? 'bg-pink-50' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
