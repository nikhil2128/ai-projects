import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Clock, Layers, Search, Archive } from 'lucide-react';
import { HistoryEntry, ROOM_TYPE_LABELS, RoomType } from '../types';
import { getHistory, deleteHistoryEntry, clearHistory } from '../lib/history';

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => getHistory());
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) =>
      e.floorPlan.rooms.some(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          ROOM_TYPE_LABELS[r.type as RoomType]?.toLowerCase().includes(q),
      ),
    );
  }, [entries, search]);

  const handleDelete = (id: string, ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    deleteHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClearAll = () => {
    clearHistory();
    setEntries([]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">No History Yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Analyzed floor plans will appear here automatically.
          </p>
          <Link
            to="/"
            className="inline-block mt-5 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Analyze a Floor Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">History</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {entries.length} saved floor plan{entries.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={handleClearAll}
            className="text-sm text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by room name or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
              bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            No results match &quot;{search}&quot;
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entry) => (
              <Link
                key={entry.id}
                to={`/history/${entry.id}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden
                  hover:shadow-lg hover:border-indigo-300 transition-all"
              >
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  <img
                    src={entry.imageDataUrl}
                    alt="Floor plan"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={(e) => handleDelete(entry.id, e)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/40 hover:bg-red-600
                      rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100
                      transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <Clock className="w-3 h-3" />
                    {formatDate(entry.createdAt)}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    {entry.floorPlan.rooms.length} room{entry.floorPlan.rooms.length !== 1 ? 's' : ''}
                    <span className="text-gray-400 font-normal">
                      &middot; {entry.floorPlan.totalWidth} &times; {entry.floorPlan.totalLength}{' '}
                      {entry.floorPlan.unit}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {entry.floorPlan.rooms.slice(0, 4).map((r, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600"
                      >
                        {r.name}
                      </span>
                    ))}
                    {entry.floorPlan.rooms.length > 4 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-400">
                        +{entry.floorPlan.rooms.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
