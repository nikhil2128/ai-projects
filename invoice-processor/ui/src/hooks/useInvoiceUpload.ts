import { useState, useCallback } from 'react';
import { uploadInvoice } from '../api/invoices';
import type { UploadingFile } from '../types/invoice';

interface UseInvoiceUploadReturn {
  files: UploadingFile[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (id: string) => void;
  uploadAll: () => Promise<string[]>;
  clearCompleted: () => void;
  clearAll: () => void;
  isUploading: boolean;
}

let fileCounter = 0;

function createUploadingFile(file: File): UploadingFile {
  fileCounter += 1;
  return {
    file,
    id: `upload-${fileCounter}-${Date.now()}`,
    status: 'uploading',
    progress: 0,
  };
}

export function useInvoiceUpload(): UseInvoiceUploadReturn {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfFiles = newFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
    );
    const uploadingFiles = pdfFiles.map(createUploadingFile);
    setFiles((prev) => [...prev, ...uploadingFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadAll = useCallback(async (): Promise<string[]> => {
    setIsUploading(true);
    const pendingFiles = files.filter((f) => f.status === 'uploading' && f.progress === 0);
    const invoiceIds: string[] = [];

    const uploadPromises = pendingFiles.map(async (uploadFile) => {
      try {
        const response = await uploadInvoice(uploadFile.file, (progress) => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, progress } : f,
            ),
          );
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'uploaded' as const,
                  progress: 100,
                  invoiceId: response.id,
                }
              : f,
          ),
        );

        invoiceIds.push(response.id);
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: 'error' as const,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : f,
          ),
        );
      }
    });

    await Promise.allSettled(uploadPromises);
    setIsUploading(false);
    return invoiceIds;
  }, [files]);

  const clearCompleted = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'uploaded'));
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    uploadAll,
    clearCompleted,
    clearAll,
    isUploading,
  };
}
