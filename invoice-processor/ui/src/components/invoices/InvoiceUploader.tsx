import { memo, useCallback, useRef, useState, type DragEvent } from 'react';
import type { UploadingFile } from '../../types/invoice';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface InvoiceUploaderProps {
  files: UploadingFile[];
  isUploading: boolean;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onUpload: () => void;
  onClearAll: () => void;
}

export const InvoiceUploader = memo(function InvoiceUploader({
  files,
  isUploading,
  onAddFiles,
  onRemoveFile,
  onUpload,
  onClearAll,
}: InvoiceUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onAddFiles(droppedFiles);
      }
    },
    [onAddFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (selected && selected.length > 0) {
        onAddFiles(Array.from(selected));
      }
      // Reset input so the same file can be selected again
      if (inputRef.current) inputRef.current.value = '';
    },
    [onAddFiles],
  );

  const pendingCount = files.filter(
    (f) => f.status === 'uploading' && f.progress === 0,
  ).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm animate-fade-in">
      <div className="p-4 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Upload Invoices
        </h2>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-gray-100'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <svg
            className={`mx-auto w-10 h-10 mb-3 transition-colors ${
              isDragOver ? 'text-primary-500' : 'text-gray-400'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
            />
          </svg>
          <p className="text-sm font-medium text-gray-700">
            {isDragOver ? 'Drop files here' : 'Drag & drop PDF invoices here'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            or click to browse &middot; PDF files only &middot; Max 10MB each
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={onClearAll}
                disabled={isUploading}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
              >
                Clear all
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {files.map((uploadFile) => (
                <FileItem
                  key={uploadFile.id}
                  file={uploadFile}
                  onRemove={onRemoveFile}
                  isUploading={isUploading}
                />
              ))}
            </div>

            {/* Upload Button */}
            <div className="pt-3">
              <button
                onClick={onUpload}
                disabled={isUploading || pendingCount === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <>
                    <LoadingSpinner size="sm" className="!text-white" />
                    Uploading...
                  </>
                ) : (
                  <>
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
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    Upload {pendingCount} invoice{pendingCount !== 1 ? 's' : ''}{' '}
                    for processing
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const FileItem = memo(function FileItem({
  file,
  onRemove,
  isUploading,
}: {
  file: UploadingFile;
  onRemove: (id: string) => void;
  isUploading: boolean;
}) {
  const fileSizeMB = (file.file.size / (1024 * 1024)).toFixed(2);

  return (
    <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg animate-slide-up">
      <div className="flex-shrink-0">
        <svg
          className="w-8 h-8 text-red-500"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
          <text
            x="12"
            y="17"
            textAnchor="middle"
            fontSize="5"
            fontWeight="bold"
            fill="white"
          >
            PDF
          </text>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.file.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{fileSizeMB} MB</span>
          {file.status === 'uploaded' && (
            <span className="text-green-600 font-medium">Uploaded</span>
          )}
          {file.status === 'error' && (
            <span className="text-red-600 font-medium">
              {file.error || 'Error'}
            </span>
          )}
        </div>
        {file.status === 'uploading' && file.progress > 0 && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(file.id)}
        disabled={isUploading && file.status === 'uploading' && file.progress > 0}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
        title="Remove"
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
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
});
