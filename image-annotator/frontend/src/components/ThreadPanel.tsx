import { useState, useRef, useEffect } from 'react';
import type { Annotation, AnnotationStatus } from '../types';
import {
  MessageCircle,
  Trash2,
  CheckCircle2,
  XCircle,
  Circle,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Props {
  annotations: Annotation[];
  selectedAnnotation: string | null;
  currentUserId: string;
  currentUserRole: string;
  onSelectAnnotation: (id: string | null) => void;
  onDeleteAnnotation: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onAddComment: (annotationId: string, body: string) => void;
  onDeleteComment: (commentId: string) => void;
}

const STATUS_BADGE: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
  OPEN: {
    icon: <Circle className="h-3.5 w-3.5" />,
    label: 'Open',
    cls: 'bg-red-50 text-red-700 ring-red-200',
  },
  RESOLVED: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Resolved',
    cls: 'bg-green-50 text-green-700 ring-green-200',
  },
  DISMISSED: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Dismissed',
    cls: 'bg-gray-50 text-gray-600 ring-gray-200',
  },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  ENGINEER: 'Engineer',
  PROCUREMENT: 'Procurement',
  FACTORY_WORKER: 'Factory',
};

export default function ThreadPanel({
  annotations,
  selectedAnnotation,
  currentUserId,
  currentUserRole,
  onSelectAnnotation,
  onDeleteAnnotation,
  onUpdateStatus,
  onAddComment,
  onDeleteComment,
}: Props) {
  if (annotations.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <MessageCircle className="mb-3 h-10 w-10 text-gray-300" />
        <h3 className="text-sm font-medium text-gray-900">No annotations yet</h3>
        <p className="mt-1 text-xs text-gray-500">
          Click "Annotate" to draw a circle and start a discussion
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <MessageCircle className="h-4 w-4" />
        Annotations ({annotations.length})
      </h2>

      {annotations.map((annotation, index) => (
        <AnnotationThread
          key={annotation.id}
          annotation={annotation}
          index={index + 1}
          isSelected={selectedAnnotation === annotation.id}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onSelect={() =>
            onSelectAnnotation(
              selectedAnnotation === annotation.id ? null : annotation.id
            )
          }
          onDelete={() => onDeleteAnnotation(annotation.id)}
          onUpdateStatus={(status) => onUpdateStatus(annotation.id, status)}
          onAddComment={(body) => onAddComment(annotation.id, body)}
          onDeleteComment={onDeleteComment}
        />
      ))}
    </div>
  );
}

function AnnotationThread({
  annotation,
  index,
  isSelected,
  currentUserId,
  currentUserRole,
  onSelect,
  onDelete,
  onUpdateStatus,
  onAddComment,
  onDeleteComment,
}: {
  annotation: Annotation;
  index: number;
  isSelected: boolean;
  currentUserId: string;
  currentUserRole: string;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: string) => void;
  onAddComment: (body: string) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const statusBadge = STATUS_BADGE[annotation.status] || STATUS_BADGE.OPEN;
  const canDelete =
    annotation.authorId === currentUserId || currentUserRole === 'ADMIN';

  // Auto-expand when selected
  useEffect(() => {
    if (isSelected) setExpanded(true);
  }, [isSelected]);

  // Scroll to bottom of comments on new comment
  useEffect(() => {
    if (isSelected && expanded) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [annotation.comments.length, isSelected, expanded]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(commentText.trim());
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`card overflow-hidden transition-shadow ${
        isSelected
          ? 'ring-2 ring-brand-500 shadow-md'
          : 'hover:shadow-sm cursor-pointer'
      }`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        onClick={onSelect}
      >
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            backgroundColor:
              annotation.status === 'RESOLVED'
                ? '#22C55E'
                : annotation.status === 'DISMISSED'
                ? '#9CA3AF'
                : annotation.color,
          }}
        >
          {index}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-gray-900">
              {annotation.label || `Annotation #${index}`}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${statusBadge.cls}`}
            >
              {statusBadge.icon}
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {annotation.author.name} ·{' '}
            {ROLE_LABELS[annotation.author.role] || annotation.author.role} ·{' '}
            {annotation.comments.length} comment
            {annotation.comments.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Status actions */}
          <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2">
            <span className="mr-1 text-[11px] text-gray-500">Status:</span>
            {(['OPEN', 'RESOLVED', 'DISMISSED'] as AnnotationStatus[]).map(
              (status) => (
                <button
                  key={status}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    annotation.status === status
                      ? STATUS_BADGE[status].cls + ' ring-1'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  onClick={() => onUpdateStatus(status)}
                >
                  {STATUS_BADGE[status].label}
                </button>
              )
            )}
            {canDelete && (
              <button
                className="ml-auto rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                title="Delete annotation"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Comments */}
          <div className="max-h-72 overflow-y-auto px-4 py-2">
            {annotation.comments.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">
                No comments yet. Start the conversation below.
              </p>
            ) : (
              <div className="space-y-3">
                {annotation.comments.map((comment) => (
                  <div key={comment.id} className="group flex gap-2.5">
                    <div
                      className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{
                        backgroundColor: commentAuthorColor(comment.author.role),
                      }}
                    >
                      {comment.author.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-900">
                          {comment.author.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {ROLE_LABELS[comment.author.role] || comment.author.role}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatTime(comment.createdAt)}
                        </span>
                        {(comment.authorId === currentUserId ||
                          currentUserRole === 'ADMIN') && (
                          <button
                            className="ml-auto hidden rounded p-0.5 text-gray-400 hover:text-red-500 group-hover:block"
                            onClick={() => onDeleteComment(comment.id)}
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>

          {/* Comment input */}
          <form
            onSubmit={handleSubmitComment}
            className="flex gap-2 border-t border-gray-100 px-4 py-3"
          >
            <input
              type="text"
              className="input-field flex-1 py-2 text-sm"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary px-3 py-2"
              disabled={!commentText.trim() || submitting}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function commentAuthorColor(role: string): string {
  switch (role) {
    case 'ENGINEER':
      return '#3B82F6';
    case 'PROCUREMENT':
      return '#F59E0B';
    case 'ADMIN':
      return '#8B5CF6';
    case 'FACTORY_WORKER':
    default:
      return '#10B981';
  }
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
