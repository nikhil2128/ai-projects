import { useCallback, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface ImageUploaderProps {
  onSelect: (file: File) => void;
  imagePreview: string | null;
  onReset: () => void;
}

export function ImageUploader({ onSelect, imagePreview, onReset }: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith('image/')) {
        onSelect(file);
      }
    },
    [onSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  if (imagePreview) {
    return (
      <div className="relative">
        <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Floor Plan</p>
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img
            src={imagePreview}
            alt="Floor plan preview"
            className="w-full h-auto"
          />
          <button
            onClick={onReset}
            className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70
              rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Upload Floor Plan</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors ${
            isDragOver
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
      >
        <ImagePlus className="w-10 h-10 mx-auto mb-3 text-gray-400" />
        <p className="text-sm text-gray-600 font-medium">
          Drop a floor plan image here
        </p>
        <p className="text-xs text-gray-400 mt-1">or click to browse</p>
        <p className="text-xs text-gray-400 mt-2">
          Supports JPEG, PNG, WebP (max 10MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
