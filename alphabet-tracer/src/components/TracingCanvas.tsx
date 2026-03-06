import { useRef, useEffect, useCallback, useState } from 'react';

interface TracingCanvasProps {
  letter: string;
  onSuccess: () => void;
  disabled: boolean;
}

const CANVAS_SIZE = 380;
const FONT_SIZE = 280;
const BRUSH_SIZE = 28;
const GUIDE_COLOR = '#E0E0E0';
const GUIDE_DASH_COLOR = '#C0C0C0';
const SUCCESS_THRESHOLD = 0.55;
const MIN_STROKES_BEFORE_CHECK = 80;

const RAINBOW_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77',
  '#4D96FF', '#9B59B6', '#FF6B9D',
];

export function TracingCanvas({ letter, onSuccess, disabled }: TracingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);
  const referenceCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const strokeCount = useRef(0);
  const colorIndex = useRef(0);
  const [progress, setProgress] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const drawingPixels = useRef(new Set<number>());

  const getReferencePixels = useCallback((): Set<number> => {
    const ref = referenceCanvasRef.current;
    if (!ref) return new Set();
    const ctx = ref.getContext('2d')!;
    const data = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    const pixels = new Set<number>();
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 128) pixels.add(Math.floor(i / 4));
    }
    return pixels;
  }, []);

  const renderReference = useCallback(() => {
    const ref = referenceCanvasRef.current;
    if (!ref) return;
    const ctx = ref.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#000';
    ctx.font = `bold ${FONT_SIZE}px "Fredoka", "Patrick Hand", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 10);
  }, [letter]);

  const renderGuide = useCallback(() => {
    const guide = guideCanvasRef.current;
    if (!guide) return;
    const ctx = guide.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = GUIDE_COLOR;
    ctx.font = `bold ${FONT_SIZE}px "Fredoka", "Patrick Hand", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 10);

    ctx.strokeStyle = GUIDE_DASH_COLOR;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.font = `bold ${FONT_SIZE}px "Fredoka", "Patrick Hand", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(letter, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 10);
    ctx.setLineDash([]);
  }, [letter]);

  const clearDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    strokeCount.current = 0;
    colorIndex.current = 0;
    drawingPixels.current.clear();
    setProgress(0);
    setShowHint(true);
  }, []);

  useEffect(() => {
    renderReference();
    renderGuide();
    clearDrawing();
  }, [letter, renderReference, renderGuide, clearDrawing]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const color = RAINBOW_COLORS[colorIndex.current % RAINBOW_COLORS.length];
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = BRUSH_SIZE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.floor(dist / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(from.x + dx * t);
      const py = Math.round(from.y + dy * t);
      for (let ox = -Math.floor(BRUSH_SIZE / 2); ox <= Math.floor(BRUSH_SIZE / 2); ox++) {
        for (let oy = -Math.floor(BRUSH_SIZE / 2); oy <= Math.floor(BRUSH_SIZE / 2); oy++) {
          if (ox * ox + oy * oy <= (BRUSH_SIZE / 2) * (BRUSH_SIZE / 2)) {
            const fx = px + ox;
            const fy = py + oy;
            if (fx >= 0 && fx < CANVAS_SIZE && fy >= 0 && fy < CANVAS_SIZE) {
              drawingPixels.current.add(fy * CANVAS_SIZE + fx);
            }
          }
        }
      }
    }
  };

  const checkProgress = useCallback(() => {
    const refPixels = getReferencePixels();
    if (refPixels.size === 0) return;

    let overlap = 0;
    for (const px of refPixels) {
      if (drawingPixels.current.has(px)) overlap++;
    }

    const coverage = overlap / refPixels.size;
    setProgress(Math.min(1, coverage / SUCCESS_THRESHOLD));

    if (coverage >= SUCCESS_THRESHOLD) {
      onSuccess();
    }
  }, [getReferencePixels, onSuccess]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getCanvasPoint(e);
    setShowHint(false);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || disabled) return;
    e.preventDefault();
    const point = getCanvasPoint(e);
    if (lastPoint.current) {
      drawLine(lastPoint.current, point);
      strokeCount.current++;
      if (strokeCount.current % 5 === 0) {
        colorIndex.current++;
      }
      if (strokeCount.current > MIN_STROKES_BEFORE_CHECK && strokeCount.current % 10 === 0) {
        checkProgress();
      }
    }
    lastPoint.current = point;
  };

  const handleEnd = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    if (strokeCount.current > MIN_STROKES_BEFORE_CHECK) {
      checkProgress();
    }
  };

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <canvas
          ref={referenceCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="reference-canvas"
        />
        <canvas
          ref={guideCanvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="guide-canvas"
        />
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="drawing-canvas"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        {showHint && (
          <div className="hint-overlay">
            <span className="hint-finger">&#9757;</span>
            <span className="hint-text">Trace the letter!</span>
          </div>
        )}
      </div>
      <div className="canvas-controls">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
          <span className="progress-label">
            {progress < 0.3 ? 'Keep going!' : progress < 0.7 ? 'Almost there!' : 'Great job!'}
          </span>
        </div>
        <button className="btn-clear" onClick={clearDrawing} disabled={disabled}>
          <span className="btn-icon">🔄</span> Try Again
        </button>
      </div>
    </div>
  );
}
