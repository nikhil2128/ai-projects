import { useRef, useState, useCallback } from 'react';
import type { Annotation, ShapeType, RectangleData, FreehandData } from '../types';
import { Circle, Square, Pencil } from 'lucide-react';

type Point = { x: number; y: number };

// ---------- Types ----------

type DrawingTool = ShapeType;

interface Props {
  imageUrl: string;
  annotations: Annotation[];
  selectedAnnotation: string | null;
  annotationMode: boolean;
  onSelectAnnotation: (id: string | null) => void;
  onCreateAnnotation: (data: {
    shapeType: ShapeType;
    centerX: number;
    centerY: number;
    radius: number;
    shapeData?: RectangleData | FreehandData;
  }) => void;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// ---------- Constants ----------

const STATUS_COLORS: Record<string, { stroke: string; fill: string }> = {
  OPEN: { stroke: '#EF4444', fill: 'rgba(239, 68, 68, 0.08)' },
  RESOLVED: { stroke: '#22C55E', fill: 'rgba(34, 197, 94, 0.08)' },
  DISMISSED: { stroke: '#9CA3AF', fill: 'rgba(156, 163, 175, 0.08)' },
};

const DRAWING_TOOLS: { type: DrawingTool; icon: typeof Circle; label: string }[] = [
  { type: 'FREEHAND', icon: Pencil, label: 'Freehand' },
  { type: 'RECTANGLE', icon: Square, label: 'Rectangle' },
  { type: 'CIRCLE', icon: Circle, label: 'Circle' },
];

const PREVIEW_STYLE = {
  fill: 'rgba(239, 68, 68, 0.1)',
  stroke: '#EF4444',
  strokeWidth: 0.4,
  strokeDasharray: '1 0.5',
};

/** Minimum distance between successive freehand points (% of image) */
const MIN_POINT_GAP = 0.4;

// ---------- Helpers ----------

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getBBox(pts: Array<{ x: number; y: number }>) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function polyStr(pts: Array<{ x: number; y: number }>) {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

/** Compute the number-badge position for an annotation */
function numBadgePos(a: Annotation): { x: number; y: number } {
  const st = a.shapeType || 'CIRCLE';

  if (st === 'RECTANGLE' && a.shapeData) {
    const d = a.shapeData as RectangleData;
    return { x: d.x + d.width + 0.8, y: d.y - 0.8 };
  }
  if (st === 'FREEHAND' && a.shapeData) {
    const d = a.shapeData as FreehandData;
    if (d.points?.length) {
      const bb = getBBox(d.points);
      return { x: bb.maxX + 0.8, y: bb.minY - 0.8 };
    }
  }
  return {
    x: a.centerX + a.radius * 0.7,
    y: a.centerY - a.radius * 0.7,
  };
}

/** Compute the comment-count badge position */
function commentBadgePos(a: Annotation): { x: number; y: number } {
  const st = a.shapeType || 'CIRCLE';

  if (st === 'RECTANGLE' && a.shapeData) {
    const d = a.shapeData as RectangleData;
    return { x: d.x - 0.8, y: d.y + d.height + 0.8 };
  }
  if (st === 'FREEHAND' && a.shapeData) {
    const d = a.shapeData as FreehandData;
    if (d.points?.length) {
      const bb = getBBox(d.points);
      return { x: bb.minX - 0.8, y: bb.maxY + 0.8 };
    }
  }
  return {
    x: a.centerX - a.radius * 0.7,
    y: a.centerY + a.radius * 0.7,
  };
}

// ---------- Sub-components ----------

function renderAnnotationShape(
  annotation: Annotation,
  colors: { stroke: string; fill: string },
  isSelected: boolean,
) {
  const st = annotation.shapeType || 'CIRCLE';
  const sw = isSelected ? 0.6 : 0.4;
  const stroke = isSelected ? '#3B82F6' : colors.stroke;
  const dash =
    annotation.status === 'DISMISSED' ? '1 0.5' : undefined;

  if (st === 'RECTANGLE' && annotation.shapeData) {
    const d = annotation.shapeData as RectangleData;
    return (
      <rect
        x={d.x}
        y={d.y}
        width={d.width}
        height={d.height}
        fill={colors.fill}
        stroke={stroke}
        strokeWidth={sw}
        strokeDasharray={dash}
        rx={0.3}
      />
    );
  }

  if (st === 'FREEHAND' && annotation.shapeData) {
    const d = annotation.shapeData as FreehandData;
    if (d.points?.length >= 2) {
      return (
        <polygon
          points={polyStr(d.points)}
          fill={colors.fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray={dash}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      );
    }
  }

  // CIRCLE (default / legacy)
  return (
    <ellipse
      cx={annotation.centerX}
      cy={annotation.centerY}
      rx={annotation.radius}
      ry={annotation.radius}
      fill={colors.fill}
      stroke={stroke}
      strokeWidth={sw}
      strokeDasharray={dash}
    />
  );
}

// ---------- Main Component ----------

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

  // Drawing state – refs for synchronous reads in event handlers,
  // state for triggering re-renders (SVG preview).
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('FREEHAND');
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [freehandPts, setFreehandPts] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Refs mirror the latest values so handleMouseUp never reads stale state
  const draggingRef = useRef<DragState | null>(null);
  const freehandPtsRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);

  // ---------- Coordinate conversion ----------

  const getRelPos = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }, []);

  // ---------- Mouse handlers ----------

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!annotationMode) return;
      e.preventDefault();
      const pos = getRelPos(e);

      if (drawingTool === 'FREEHAND') {
        isDrawingRef.current = true;
        freehandPtsRef.current = [pos];
        setIsDrawing(true);
        setFreehandPts([pos]);
      } else {
        const drag = { startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y };
        draggingRef.current = drag;
        setDragging(drag);
      }
    },
    [annotationMode, drawingTool, getRelPos],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (drawingTool === 'FREEHAND' && isDrawingRef.current) {
        e.preventDefault();
        const pos = getRelPos(e);
        const prev = freehandPtsRef.current;
        const last = prev[prev.length - 1];
        if (last && dist(last, pos) < MIN_POINT_GAP) return;
        const next = [...prev, pos];
        freehandPtsRef.current = next;
        setFreehandPts(next);
      } else if (draggingRef.current) {
        e.preventDefault();
        const pos = getRelPos(e);
        const next = { ...draggingRef.current, currentX: pos.x, currentY: pos.y };
        draggingRef.current = next;
        setDragging(next);
      }
    },
    [drawingTool, getRelPos],
  );

  const handleMouseUp = useCallback(() => {
    // --- Freehand ---
    if (drawingTool === 'FREEHAND' && isDrawingRef.current) {
      const pts = freehandPtsRef.current;
      if (pts.length >= 3) {
        const bb = getBBox(pts);
        const w = bb.maxX - bb.minX;
        const h = bb.maxY - bb.minY;
        if (Math.max(w, h) >= 1) {
          onCreateAnnotation({
            shapeType: 'FREEHAND',
            centerX: (bb.minX + bb.maxX) / 2,
            centerY: (bb.minY + bb.maxY) / 2,
            radius: 0,
            shapeData: { points: pts },
          });
        }
      }
      isDrawingRef.current = false;
      freehandPtsRef.current = [];
      setIsDrawing(false);
      setFreehandPts([]);
      return;
    }

    // --- Circle / Rectangle ---
    const drag = draggingRef.current;
    if (!drag) return;

    if (drawingTool === 'CIRCLE') {
      const dx = drag.currentX - drag.startX;
      const dy = drag.currentY - drag.startY;
      const radius = Math.sqrt(dx * dx + dy * dy);
      if (radius >= 1) {
        onCreateAnnotation({
          shapeType: 'CIRCLE',
          centerX: drag.startX,
          centerY: drag.startY,
          radius: Math.min(radius, 50),
        });
      }
    } else if (drawingTool === 'RECTANGLE') {
      const x = Math.min(drag.startX, drag.currentX);
      const y = Math.min(drag.startY, drag.currentY);
      const w = Math.abs(drag.currentX - drag.startX);
      const h = Math.abs(drag.currentY - drag.startY);
      if (w >= 1 && h >= 1) {
        onCreateAnnotation({
          shapeType: 'RECTANGLE',
          centerX: x + w / 2,
          centerY: y + h / 2,
          radius: 0,
          shapeData: { x, y, width: w, height: h },
        });
      }
    }

    draggingRef.current = null;
    setDragging(null);
  }, [drawingTool, onCreateAnnotation]);

  const handleMouseLeave = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = null;
      setDragging(null);
    }
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      freehandPtsRef.current = [];
      setIsDrawing(false);
      setFreehandPts([]);
    }
  }, []);

  const handleAnnotationClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!annotationMode) {
        onSelectAnnotation(selectedAnnotation === id ? null : id);
      }
    },
    [annotationMode, selectedAnnotation, onSelectAnnotation],
  );

  const handleBackgroundClick = useCallback(() => {
    if (!annotationMode && !dragging && !isDrawing) {
      onSelectAnnotation(null);
    }
  }, [annotationMode, dragging, isDrawing, onSelectAnnotation]);

  // ---------- Previews ----------

  const circlePreview =
    drawingTool === 'CIRCLE' && dragging
      ? {
          cx: dragging.startX,
          cy: dragging.startY,
          r: Math.min(
            Math.sqrt(
              (dragging.currentX - dragging.startX) ** 2 +
                (dragging.currentY - dragging.startY) ** 2,
            ),
            50,
          ),
        }
      : null;

  const rectPreview =
    drawingTool === 'RECTANGLE' && dragging
      ? {
          x: Math.min(dragging.startX, dragging.currentX),
          y: Math.min(dragging.startY, dragging.currentY),
          w: Math.abs(dragging.currentX - dragging.startX),
          h: Math.abs(dragging.currentY - dragging.startY),
        }
      : null;

  // ---------- Render ----------

  return (
    <div
      ref={containerRef}
      className={`card relative select-none overflow-hidden ${
        annotationMode ? 'annotation-mode' : ''
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleBackgroundClick}
    >
      {/* Image */}
      <img
        src={imageUrl}
        alt="Annotated image"
        className="block w-full"
        draggable={false}
        onLoad={() => setImageLoaded(true)}
      />

      {/* Drawing-tool toolbar (visible in annotation mode) */}
      {annotationMode && (
        <div className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-white/95 px-2 py-1.5 shadow-lg ring-1 ring-gray-200/80 backdrop-blur-sm">
          {DRAWING_TOOLS.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              title={label}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                drawingTool === type
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setDrawingTool(type);
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* SVG overlay */}
      {imageLoaded && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ pointerEvents: 'none' }}
        >
          {/* Existing annotations */}
          {annotations.map((annotation) => {
            const isSelected = selectedAnnotation === annotation.id;
            const colors = STATUS_COLORS[annotation.status] || STATUS_COLORS.OPEN;
            const nPos = numBadgePos(annotation);
            const cPos = commentBadgePos(annotation);

            return (
              <g
                key={annotation.id}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={(e: React.MouseEvent) =>
                  handleAnnotationClick(e, annotation.id)
                }
              >
                {/* Shape */}
                {renderAnnotationShape(annotation, colors, isSelected)}

                {/* Number badge */}
                <circle
                  cx={nPos.x}
                  cy={nPos.y}
                  r={1.8}
                  fill={isSelected ? '#3B82F6' : colors.stroke}
                />
                <text
                  x={nPos.x}
                  y={nPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="1.6"
                  fontWeight="bold"
                  style={{ pointerEvents: 'none' }}
                >
                  {annotations.indexOf(annotation) + 1}
                </text>

                {/* Comment count badge */}
                {annotation.comments.length > 0 && (
                  <>
                    <circle
                      cx={cPos.x}
                      cy={cPos.y}
                      r={1.5}
                      fill="white"
                      stroke={colors.stroke}
                      strokeWidth={0.2}
                    />
                    <text
                      x={cPos.x}
                      y={cPos.y}
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

          {/* ---- Drawing previews ---- */}

          {/* Circle preview */}
          {circlePreview && circlePreview.r >= 1 && (
            <ellipse
              cx={circlePreview.cx}
              cy={circlePreview.cy}
              rx={circlePreview.r}
              ry={circlePreview.r}
              {...PREVIEW_STYLE}
            />
          )}

          {/* Rectangle preview */}
          {rectPreview && (rectPreview.w >= 1 || rectPreview.h >= 1) && (
            <rect
              x={rectPreview.x}
              y={rectPreview.y}
              width={rectPreview.w}
              height={rectPreview.h}
              {...PREVIEW_STYLE}
              rx={0.3}
            />
          )}

          {/* Freehand preview */}
          {isDrawing && freehandPts.length >= 2 && (
            <polygon
              points={polyStr(freehandPts)}
              fill="rgba(239, 68, 68, 0.08)"
              stroke="#EF4444"
              strokeWidth={0.4}
              strokeDasharray="1 0.5"
              strokeLinejoin="round"
              strokeLinecap="round"
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
