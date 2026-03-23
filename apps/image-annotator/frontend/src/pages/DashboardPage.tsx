import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/client';
import type { Image, ImagesResponse } from '../types';
import {
  Upload,
  ImageIcon,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  ENGINEER: 'bg-blue-100 text-blue-700',
  PROCUREMENT: 'bg-amber-100 text-amber-700',
  FACTORY_WORKER: 'bg-green-100 text-green-700',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [images, setImages] = useState<Image[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const loadImages = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const result = await api.getImages(page);
      setImages(result.images);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to load images:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Image Gallery</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pagination.total} image{pagination.total !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <button className="btn-primary gap-2" onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4" />
          Upload Image
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            loadImages();
          }}
        />
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 py-20">
          <ImageIcon className="mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No images yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload a photo to get started with annotations
          </p>
          <button
            className="btn-primary mt-4 gap-2"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4" />
            Upload first image
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                className="btn-secondary gap-1 px-3"
                disabled={pagination.page <= 1}
                onClick={() => loadImages(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <span className="px-3 text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn-secondary gap-1 px-3"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadImages(pagination.page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ImageCard({ image }: { image: Image }) {
  const [imgSrc, setImgSrc] = useState(api.getThumbnailUrl(image.id));

  return (
    <Link
      to={`/images/${image.id}`}
      className="card group overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={imgSrc}
          alt={image.title}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          onError={() => setImgSrc('/placeholder.svg')}
        />
        {(image._count?.annotations ?? 0) > 0 && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            <MessageCircle className="h-3 w-3" />
            {image._count?.annotations}
          </div>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="truncate font-medium text-gray-900">{image.title}</h3>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
              {image.uploader.name.charAt(0)}
            </div>
            <span className="text-xs text-gray-500">{image.uploader.name}</span>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
              ROLE_COLORS[image.uploader.role] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {image.uploader.role.replace('_', ' ')}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          {new Date(image.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
    </Link>
  );
}

function UploadModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(selected.type)) {
        setError('Only PNG and JPEG files are allowed');
        return;
      }
      setFile(selected);
      setError('');
      setPreview(URL.createObjectURL(selected));
      if (!title) {
        setTitle(selected.name.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      await api.uploadImage(file, title, description || undefined);
      onUploaded();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upload Image</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File drop zone */}
          <div
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors ${
              file
                ? 'border-brand-300 bg-brand-50'
                : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="max-h-48 rounded-lg object-contain"
              />
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-gray-400" />
                <p className="text-sm font-medium text-gray-600">
                  Click to select an image
                </p>
                <p className="mt-1 text-xs text-gray-400">PNG or JPEG, up to 20MB</p>
              </>
            )}
            <input
              id="file-input"
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Scratch on Part #A2847"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              className="input-field min-h-[80px] resize-y"
              placeholder="Add details about the image..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!file || !title || uploading}
            >
              {uploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                'Upload'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
