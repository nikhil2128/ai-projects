import { useRef, useState, useEffect, useCallback } from 'react';
import type { Annotation } from '../types';

interface Props {
  imageUrl: string;
  annotations: Annotation[];
  selectedAnnotation: string | null;
  annotationMode: boolean;
  onSelectAnnotation: (id: string | null) => void;
  onCreateAnnotation: (data: { centerX: number; centerY: number; radius: number }) => void;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const STATUS_COLORS: Record<string, { stroke: string; fill: string }> = {
  OPEN: { stroke: '#EF4444', fill: 'rgba(239, 68, 68, 0.08)' },
  RESOLVED: { stroke: '#22C55E', fill: 'rgba(34, 197, 94, 0.08)' },
  DISMISSED: { stroke: '#9CA3AF', fill: 'rgba(156, 163, 175, 0.08)' },
};

export default function AnnotationCanvas({
  imageUrl,
  annotations,
  selectedAnnotation,
  annotationMode,
  onSelectAnnotation,
  onCreateAnnotation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<DragState | null>(null);

  const getRelativePosition = useCallback(
    (e: React.MouseEvent): { x: number; y: number } => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!annotationMode) return;
      e.preventDefault();
      const pos = getRelativePosition(e);
      setDragging({
        startX: pos.x,
        startY: pos.y,
        currentX: pos.x,
        currentY: pos.y,
      });
    },
    [annotationMode, getRelativePosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      e.preventDefault();
      const pos = getRelativePosition(e);
      setDragging((prev) =>
        prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null
      );
    },
    [dragging, getRelativePosition]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;

    const dx = dragging.currentX - dragging.startX;
    const dy = dragging.currentY - dragging.startY;
    const radius = Math.sqrt(dx * dx + dy * dy);

    // Minimum radius to avoid accidental clicks
    if (radius >= 1) {
      onCreateAnnotation({
        centerX: dragging.startX,
        centerY: dragging.startY,
        radius: Math.min(radius, 50),
      });
    }

    setDragging(null);
  }, [dragging, onCreateAnnotation]);

  const handleAnnotationClick = useCallback(
    (e: React.MouseEvent, annotationId: string) => {
      e.stopPropagation();
      if (!annotationMode) {
        onSelectAnnotation(
          selectedAnnotation === annotationId ? null : annotationId
        );
      }
    },
    [annotationMode, selectedAnnotation, onSelectAnnotation]
  );

  const handleBackgroundClick = useCallback(() => {
    if (!annotationMode && !dragging) {
      onSelectAnnotation(null);
    }
  }, [annotationMode, dragging, onSelectAnnotation]);

  // Compute drag preview circle
  const dragPreview = dragging
    ? {
        centerX: dragging.startX,
        centerY: dragging.startY,
        radius: Math.min(
          Math.sqrt(
            (dragging.currentX - dragging.startX) ** 2 +
              (dragging.currentY - dragging.startY) ** 2
          ),
          50
        ),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className={`card relative select-none overflow-hidden ${
        annotationMode ? 'annotation-mode' : ''
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (dragging) setDragging(null);
      }}
      onClick={handleBackgroundClick}
    >
      {/* Image */}
      <img
        src={imageUrl}
        alt="Annotated image"
        className="block w-full"
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setImageLoaded(true);
        }}
      />

      {/* Annotation overlays */}
      {imageLoaded && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ pointerEvents: 'none' }}
        >
          {annotations.map((annotation) => {
            const isSelected = selectedAnnotation === annotation.id;
            const colors =
              STATUS_COLORS[annotation.status] || STATUS_COLORS.OPEN;

            return (
              <g key={annotation.id} style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={(e: any) => handleAnnotationClick(e, annotation.id)}
              >
                {/* Circle */}
                <ellipse
                  cx={annotation.centerX}
                  cy={annotation.centerY}
                  rx={annotation.radius}
                  ry={annotation.radius}
                  fill={colors.fill}
                  stroke={isSelected ? '#3B82F6' : colors.stroke}
                  strokeWidth={isSelected ? 0.6 : 0.4}
                  strokeDasharray={annotation.status === 'DISMISSED' ? '1 0.5' : undefined}
                />

                {/* Number badge */}
                <circle
                  cx={annotation.centerX + annotation.radius * 0.7}
                  cy={annotation.centerY - annotation.radius * 0.7}
                  r={1.8}
                  fill={isSelected ? '#3B82F6' : colors.stroke}
                />
                <text
                  x={annotation.centerX + annotation.radius * 0.7}
                  y={annotation.centerY - annotation.radius * 0.7}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="1.6"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {annotations.indexOf(annotation) + 1}
                </text>

                {/* Comment count */}
                {annotation.comments.length > 0 && (
                  <>
                    <circle
                      cx={annotation.centerX - annotation.radius * 0.7}
                      cy={annotation.centerY + annotation.radius * 0.7}
                      r={1.5}
                      fill="white"
                      stroke={colors.stroke}
                      strokeWidth={0.2}
                    />
                    <text
                      x={annotation.centerX - annotation.radius * 0.7}
                      y={annotation.centerY + annotation.radius * 0.7}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={colors.stroke}
                      fontSize="1.2"
                      fontWeight="bold"
                      style={{ pointerEvents: 'none' }}
                    >
                      {annotation.comments.length}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Drag preview */}
          {dragPreview && dragPreview.radius >= 1 && (
            <ellipse
              cx={dragPreview.centerX}
              cy={dragPreview.centerY}
              rx={dragPreview.radius}
              ry={dragPreview.radius}
              fill="rgba(239, 68, 68, 0.1)"
              stroke="#EF4444"
              strokeWidth={0.4}
              strokeDasharray="1 0.5"
            />
          )}
        </svg>
      )}

      {/* Loading indicator */}
      {!imageLoaded && (
        <div className="flex aspect-video items-center justify-center bg-gray-100">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        </div>
      )}
    </div>
  );
}
