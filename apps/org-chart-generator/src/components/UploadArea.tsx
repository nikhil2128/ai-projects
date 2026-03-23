import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface UploadAreaProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
}

export default function UploadArea({
  onFileSelected,
  isProcessing,
}: UploadAreaProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);

      onFileSelected(file);
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-12">
      <div className="text-center mb-10 max-w-2xl">
        <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          Turn handwritten org charts
          <br />
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            into beautiful visuals
          </span>
        </h2>
        <p className="text-lg text-slate-500">
          Upload a screenshot of your handwritten organization structure and
          watch AI transform it into a polished, downloadable org chart.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          relative w-full max-w-xl rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${isProcessing ? "pointer-events-none opacity-60" : ""}
          ${
            isDragActive
              ? "border-indigo-400 bg-indigo-50 scale-[1.02] shadow-xl shadow-indigo-100"
              : "border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50 hover:shadow-lg"
          }
        `}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <div className="flex flex-col items-center py-16 px-8">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
            </div>
            <p className="text-lg font-semibold text-slate-700">
              Analyzing your org chart...
            </p>
            <p className="text-sm text-slate-500 mt-2">
              AI is reading the handwritten structure
            </p>
          </div>
        ) : preview ? (
          <div className="p-6">
            <img
              src={preview}
              alt="Uploaded org chart"
              className="w-full rounded-xl object-contain max-h-64"
            />
            <p className="text-center text-sm text-slate-500 mt-4">
              Processing this image...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-slate-700 mb-1">
              {isDragActive
                ? "Drop your image here"
                : "Drop your screenshot here"}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              or click to browse files
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-500">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6.75v10.5A2.25 2.25 0 003.75 21z"
                />
              </svg>
              PNG, JPG, WEBP supported
            </span>
          </div>
        )}
      </div>

      <div className="mt-12 grid grid-cols-3 gap-8 max-w-xl w-full">
        {[
          {
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            ),
            label: "Upload",
            desc: "Screenshot",
          },
          {
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            ),
            label: "AI Parses",
            desc: "Structure",
          },
          {
            icon: (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            ),
            label: "Download",
            desc: "Org Chart",
          },
        ].map((step, i) => (
          <div key={i} className="text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                {step.icon}
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">{step.label}</p>
            <p className="text-xs text-slate-400">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
