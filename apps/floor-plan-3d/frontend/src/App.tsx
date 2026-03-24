import { useState } from 'react';
import { Box, Upload } from 'lucide-react';
import { FloorPlan } from './types';
import { ImageUploader } from './components/ImageUploader';
import { ControlPanel } from './components/ControlPanel';
import { FloorPlan3DViewer } from './components/FloorPlan3DViewer';

export default function App() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallHeight, setWallHeight] = useState(10);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const handleImageSelect = (file: File) => {
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setFloorPlan(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const data: FloorPlan = await response.json();
      setFloorPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setImagePreview(null);
    setFloorPlan(null);
    setError(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Box className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">FloorViz</h1>
          <p className="text-xs text-gray-500">2D Floor Plan → 3D Model</p>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[380px] flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-5 space-y-5">
            <ImageUploader
              onSelect={handleImageSelect}
              imagePreview={imagePreview}
              onReset={handleReset}
            />

            {imagePreview && !floorPlan && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-2.5 px-4 rounded-lg font-medium text-white
                  bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
                  transition-colors flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing Floor Plan...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Analyze &amp; Generate 3D Model
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {floorPlan && (
              <ControlPanel
                floorPlan={floorPlan}
                wallHeight={wallHeight}
                onWallHeightChange={setWallHeight}
                showLabels={showLabels}
                onShowLabelsChange={setShowLabels}
                showGrid={showGrid}
                onShowGridChange={setShowGrid}
              />
            )}
          </div>
        </aside>

        <main className="flex-1 relative bg-gray-100">
          {floorPlan ? (
            <FloorPlan3DViewer
              floorPlan={floorPlan}
              wallHeight={wallHeight}
              showLabels={showLabels}
              showGrid={showGrid}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400 max-w-sm">
                <Box className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium text-gray-500">No 3D Model Yet</p>
                <p className="text-sm mt-1">
                  Upload a 2D floor plan image and click &quot;Analyze&quot; to generate
                  an interactive 3D model.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
