import { useCallback, useRef, useState } from "react";
import { Upload, FileWarning, FileUp } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File) => void;
  error?: string;
}

export function FileUpload({ onUpload, error }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const ext = file.name.toLowerCase();
      if (!ext.endsWith(".pptx") && !ext.endsWith(".ppt")) {
        return;
      }
      onUpload(file);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="text-center mb-12 max-w-2xl">
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Analyze Your Presentation
        </h2>
        <p className="text-slate-400 text-lg">
          Upload a PowerPoint file to get AI-generated charts, insights, and
          actionable plans for each slide
        </p>
      </div>

      <div
        className={`relative w-full max-w-xl rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
          dragActive
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.02]"
            : "border-slate-600 hover:border-indigo-500/50 hover:bg-white/5"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center py-16 px-8">
          <div
            className={`p-4 rounded-2xl mb-6 transition-colors ${
              dragActive ? "bg-indigo-500/20" : "bg-slate-800"
            }`}
          >
            {dragActive ? (
              <FileUp className="w-10 h-10 text-indigo-400" />
            ) : (
              <Upload className="w-10 h-10 text-slate-400" />
            )}
          </div>

          <p className="text-white font-semibold text-lg mb-1">
            {dragActive ? "Drop your file here" : "Drag & drop your PowerPoint"}
          </p>
          <p className="text-slate-500 text-sm mb-6">or click to browse</p>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/80 rounded-full px-4 py-1.5">
            <FileWarning className="w-3.5 h-3.5" />
            Supports .pptx files up to 50MB
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pptx,.ppt"
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-6 max-w-xl w-full rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-4 animate-slide-up">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
        {[
          {
            title: "Slide Analysis",
            desc: "AI extracts key points and summaries from each slide",
          },
          {
            title: "Chart Generation",
            desc: "Relevant charts are auto-generated from slide data",
          },
          {
            title: "Action Plans",
            desc: "Concrete action items with priorities and timelines",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="glass-card rounded-xl p-5 text-center"
          >
            <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
            <p className="text-slate-400 text-sm">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
