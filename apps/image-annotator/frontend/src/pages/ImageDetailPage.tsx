import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import * as api from '../api/client';
import type { ImageDetail, Annotation, Comment as CommentType, ShapeType, RectangleData, FreehandData } from '../types';
import AnnotationCanvas from '../components/AnnotationCanvas';
import ThreadPanel from '../components/ThreadPanel';
import {
  ArrowLeft,
  Trash2,
  PenLine,
  MousePointer,
  Loader2,
} from 'lucide-react';

export default function ImageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [image, setImage] = useState<ImageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [annotationMode, setAnnotationMode] = useState(false);

  const { onEvent } = useSocket(id || null);

  const loadImage = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getImage(id);
      setImage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load image');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  // Real-time updates
  useEffect(() => {
    const unsub1 = onEvent('annotation:created', (annotation: Annotation) => {
      setImage((prev) => {
        if (!prev) return prev;
        // Avoid duplicates
        if (prev.annotations.some((a) => a.id === annotation.id)) return prev;
        return { ...prev, annotations: [...prev.annotations, annotation] };
      });
    });

    const unsub2 = onEvent('annotation:updated', (annotation: Annotation) => {
      setImage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          annotations: prev.annotations.map((a) =>
            a.id === annotation.id ? annotation : a
          ),
        };
      });
    });

    const unsub3 = onEvent('annotation:deleted', (data: { annotationId: string }) => {
      setImage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          annotations: prev.annotations.filter((a) => a.id !== data.annotationId),
        };
      });
      setSelectedAnnotation((prev) => (prev === data.annotationId ? null : prev));
    });

    const unsub4 = onEvent(
      'comment:created',
      (comment: CommentType & { annotationId: string }) => {
        setImage((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            annotations: prev.annotations.map((a) =>
              a.id === comment.annotationId
                ? {
                    ...a,
                    comments: a.comments.some((c) => c.id === comment.id)
                      ? a.comments
                      : [...a.comments, comment],
                  }
                : a
            ),
          };
        });
      }
    );

    const unsub5 = onEvent(
      'comment:deleted',
      (data: { commentId: string; annotationId: string }) => {
        setImage((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            annotations: prev.annotations.map((a) =>
              a.id === data.annotationId
                ? { ...a, comments: a.comments.filter((c) => c.id !== data.commentId) }
                : a
            ),
          };
        });
      }
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [onEvent]);

  const handleCreateAnnotation = async (data: {
    shapeType: ShapeType;
    centerX: number;
    centerY: number;
    radius: number;
    shapeData?: RectangleData | FreehandData;
  }) => {
    if (!id) return;
    try {
      const annotation = await api.createAnnotation(id, data);
      // Optimistic: real-time event will also arrive, dedup handles it
      setImage((prev) => {
        if (!prev) return prev;
        if (prev.annotations.some((a) => a.id === annotation.id)) return prev;
        return { ...prev, annotations: [...prev.annotations, annotation] };
      });
      setSelectedAnnotation(annotation.id);
      setAnnotationMode(false);
    } catch (err: any) {
      console.error('Failed to create annotation:', err);
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await api.deleteAnnotation(annotationId);
      setImage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          annotations: prev.annotations.filter((a) => a.id !== annotationId),
        };
      });
      if (selectedAnnotation === annotationId) {
        setSelectedAnnotation(null);
      }
    } catch (err: any) {
      console.error('Failed to delete annotation:', err);
    }
  };

  const handleUpdateAnnotationStatus = async (
    annotationId: string,
    status: string
  ) => {
    try {
      const updated = await api.updateAnnotation(annotationId, { status });
      setImage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          annotations: prev.annotations.map((a) =>
            a.id === annotationId ? updated : a
          ),
        };
      });
    } catch (err: any) {
      console.error('Failed to update annotation:', err);
    }
  };

  const handleAddComment = async (annotationId: string, body: string) => {
    try {
      const comment = await api.createComment(annotationId, body);
      setImage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          annotations: prev.annotations.map((a) =>
            a.id === annotationId
              ? {
                  ...a,
                  comments: a.comments.some((c) => c.id === comment.id)
                    ? a.comments
                    : [...a.comments, comment],
                }
              : a
          ),
        };
      });
    } catch (err: any) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId);
      setImage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          annotations: prev.annotations.map((a) => ({
            ...a,
            comments: a.comments.filter((c) => c.id !== commentId),
          })),
        };
      });
    } catch (err: any) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleDeleteImage = async () => {
    if (!id || !confirm('Delete this image and all annotations?')) return;
    try {
      await api.deleteImage(id);
      navigate('/');
    } catch (err: any) {
      console.error('Failed to delete image:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">{error || 'Image not found'}</p>
        <Link to="/" className="btn-secondary mt-4 inline-flex gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to gallery
        </Link>
      </div>
    );
  }

  const selectedAnnotationObj = image.annotations.find(
    (a) => a.id === selectedAnnotation
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{image.title}</h1>
            {image.description && (
              <p className="text-sm text-gray-500">{image.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              annotationMode
                ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                : 'bg-brand-100 text-brand-700 ring-1 ring-brand-200 hover:bg-brand-200'
            }`}
            onClick={() => {
              setAnnotationMode(!annotationMode);
              if (!annotationMode) setSelectedAnnotation(null);
            }}
          >
            {annotationMode ? (
              <>
                <MousePointer className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <PenLine className="h-4 w-4" />
                Annotate
              </>
            )}
          </button>

          {(user?.id === image.uploaderId || user?.role === 'ADMIN') && (
            <button
              className="btn-danger gap-2 px-3 py-2 text-sm"
              onClick={handleDeleteImage}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Annotation hint */}
      {annotationMode && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Pick a shape from the toolbar above the image, then click and drag to draw your annotation.
        </div>
      )}

      {/* Main content: Canvas + Thread Panel */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Image with annotations */}
        <div className="flex-1">
          <AnnotationCanvas
            imageUrl={api.getImageFileUrl(image.id)}
            annotations={image.annotations}
            selectedAnnotation={selectedAnnotation}
            annotationMode={annotationMode}
            onSelectAnnotation={setSelectedAnnotation}
            onCreateAnnotation={handleCreateAnnotation}
          />

          {/* Image metadata */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>
              {image.width} x {image.height}px
            </span>
            <span>{(image.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            <span>Uploaded by {image.uploader.name}</span>
            <span>
              {new Date(image.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Threads side panel */}
        <div className="w-full lg:w-96">
          <ThreadPanel
            annotations={image.annotations}
            selectedAnnotation={selectedAnnotation}
            currentUserId={user?.id || ''}
            currentUserRole={user?.role || 'FACTORY_WORKER'}
            onSelectAnnotation={setSelectedAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            onUpdateStatus={handleUpdateAnnotationStatus}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        </div>
      </div>
    </div>
  );
}
