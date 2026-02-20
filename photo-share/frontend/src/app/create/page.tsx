'use client';

import { useState, useRef, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import PhotoFilters from '@/components/PhotoFilters';

export default function CreatePostPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [filter, setFilter] = useState('none');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
    setFilter('none');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('caption', caption);
      formData.append('filter', filter);
      await api.posts.create(formData);
      router.push('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">New Post</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile && droppedFile.type.startsWith('image/')) {
                  handleFileSelect(droppedFile);
                }
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-20 transition-colors hover:border-pink-300 hover:bg-pink-50/30"
            >
              <div className="mb-3 text-5xl">📸</div>
              <p className="mb-1 text-sm font-medium text-gray-700">
                Click or drag & drop to upload
              </p>
              <p className="text-xs text-gray-400">
                JPEG, PNG, GIF, or WebP (max 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className={`w-full object-contain filter-${filter}`}
                  style={{ maxHeight: '500px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setFilter('none');
                  }}
                  className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70"
                >
                  Change
                </button>
              </div>

              <PhotoFilters
                imageUrl={preview}
                selectedFilter={filter}
                onSelectFilter={setFilter}
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />

          <textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
          />

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 py-3 text-sm font-semibold text-white transition-shadow hover:shadow-md disabled:opacity-50"
          >
            {uploading ? 'Sharing...' : 'Share Post'}
          </button>
        </form>
      </main>
    </div>
  );
}
