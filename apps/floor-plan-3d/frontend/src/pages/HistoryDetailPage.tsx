import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Trash2 } from 'lucide-react';
import { getHistoryEntry, deleteHistoryEntry } from '../lib/history';
import { ControlPanel } from '../components/ControlPanel';
import { FloorPlan3DViewer } from '../components/FloorPlan3DViewer';

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entry] = useState(() => (id ? getHistoryEntry(id) : undefined));
  const [wallHeight, setWallHeight] = useState(10);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showImage, setShowImage] = useState(false);

  if (!entry) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm">
          <p className="text-lg font-medium text-gray-500">Entry Not Found</p>
          <p className="text-sm text-gray-400 mt-1">
            This floor plan may have been deleted.
          </p>
          <Link
            to="/history"
            className="inline-block mt-5 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    deleteHistoryEntry(entry.id);
    navigate('/history');
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

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-[380px] flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/history')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              History
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">{formatDate(entry.createdAt)}</p>
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              <img
                src={entry.imageDataUrl}
                alt="Floor plan"
                className="w-full h-auto"
              />
            </div>
          </div>

          <ControlPanel
            floorPlan={entry.floorPlan}
            wallHeight={wallHeight}
            onWallHeightChange={setWallHeight}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
            showGrid={showGrid}
            onShowGridChange={setShowGrid}
          />
        </div>
      </aside>

      <main className="flex-1 relative bg-gray-100">
        <FloorPlan3DViewer
          floorPlan={entry.floorPlan}
          wallHeight={wallHeight}
          showLabels={showLabels}
          showGrid={showGrid}
        />

        <button
          onClick={() => setShowImage(!showImage)}
          className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-white/90 backdrop-blur
            border border-gray-200 rounded-lg shadow-sm text-sm text-gray-600
            hover:bg-white transition-colors flex items-center gap-1.5"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          {showImage ? 'Hide' : 'Show'} 2D Plan
        </button>

        {showImage && (
          <div className="absolute bottom-4 right-4 z-10 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <img
              src={entry.imageDataUrl}
              alt="Original floor plan"
              className="w-full h-auto"
            />
          </div>
        )}
      </main>
    </div>
  );
}
