import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Image, Loader2, X } from "lucide-react";

interface ImageUploadProps {
  onTopicsExtracted: (topics: string[], preview: string) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function ImageUpload({
  onTopicsExtracted,
  onError,
  isLoading,
  setIsLoading,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setFileName(file.name);
      setIsLoading(true);

      try {
        const { extractTopicsFromImage } = await import("../api/client");
        const topics = await extractTopicsFromImage(file);
        onTopicsExtracted(topics, URL.createObjectURL(file));
      } catch (err) {
        onError(
          err instanceof Error ? err.message : "Failed to analyze image"
        );
        setPreview(null);
        setFileName("");
      } finally {
        setIsLoading(false);
      }
    },
    [onTopicsExtracted, onError, setIsLoading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"] },
    maxFiles: 1,
    disabled: isLoading,
  });

  const clearPreview = () => {
    setPreview(null);
    setFileName("");
  };

  return (
    <div className="space-y-4">
      {preview && !isLoading ? (
        <div className="relative glass-card p-4">
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-colors"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
          <img
            src={preview}
            alt="Uploaded preview"
            className="max-h-64 mx-auto rounded-lg object-contain"
          />
          <p className="text-center text-sm text-slate-400 mt-2">{fileName}</p>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            glass-card p-12 text-center cursor-pointer transition-all duration-300
            ${isDragActive ? "border-blue-400/50 bg-blue-500/10 scale-[1.02]" : "hover:border-white/20 hover:bg-white/[0.05]"}
            ${isLoading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <input {...getInputProps()} />
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
              <div>
                <p className="text-lg font-medium text-slate-200">
                  Analyzing image...
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Extracting training topics with AI
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
                {isDragActive ? (
                  <Image className="w-12 h-12 text-blue-400" />
                ) : (
                  <Upload className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-medium text-slate-200">
                  {isDragActive
                    ? "Drop your image here"
                    : "Upload an image to extract topics"}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Supports PNG, JPG, GIF, WebP — Whiteboard photos, slides,
                  notes, diagrams
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
