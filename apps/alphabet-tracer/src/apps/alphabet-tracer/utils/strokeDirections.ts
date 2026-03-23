export interface LetterDirectionRules {
  /** Vertical line strokes must go top-to-bottom */
  verticalDown?: boolean;
  /** Horizontal line strokes must go left-to-right */
  horizontalRight?: boolean;
  /** Curve strokes must follow this rotation ('cw' or 'ccw' in screen coordinates) */
  curveRotation?: 'cw' | 'ccw';
}

export const LETTER_DIRECTION_RULES: Record<string, LetterDirectionRules> = {
  a: { verticalDown: true, curveRotation: 'ccw' },
  b: { verticalDown: true, curveRotation: 'cw' },
  c: { curveRotation: 'ccw' },
  d: { verticalDown: true, curveRotation: 'ccw' },
  e: { curveRotation: 'ccw' },
  f: { verticalDown: true, horizontalRight: true },
  g: { verticalDown: true, curveRotation: 'ccw' },
  h: { verticalDown: true },
  i: { verticalDown: true },
  j: { verticalDown: true },
  k: { verticalDown: true },
  l: { verticalDown: true },
  m: { verticalDown: true },
  n: { verticalDown: true },
  o: { curveRotation: 'ccw' },
  p: { verticalDown: true, curveRotation: 'cw' },
  q: { verticalDown: true, curveRotation: 'ccw' },
  r: { verticalDown: true },
  s: { verticalDown: true },
  t: { verticalDown: true, horizontalRight: true },
  u: { curveRotation: 'ccw' },
  v: {},
  w: {},
  x: {},
  y: { verticalDown: true },
  z: { horizontalRight: true },
};

interface Point {
  x: number;
  y: number;
}

export interface StrokeAnalysis {
  pathLength: number;
  netDx: number;
  netDy: number;
  netDisplacement: number;
  straightness: number;
  rotation: number;
}

const MIN_SUBSAMPLE_DIST_SQ = 100; // 10px minimum distance between subsampled points

function computeRotation(points: Point[]): number {
  const filtered: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1];
    const dx = points[i].x - prev.x;
    const dy = points[i].y - prev.y;
    if (dx * dx + dy * dy >= MIN_SUBSAMPLE_DIST_SQ) {
      filtered.push(points[i]);
    }
  }
  if (filtered[filtered.length - 1] !== points[points.length - 1]) {
    filtered.push(points[points.length - 1]);
  }
  if (filtered.length < 3) return 0;

  let totalAngle = 0;
  for (let i = 1; i < filtered.length - 1; i++) {
    const dx1 = filtered[i].x - filtered[i - 1].x;
    const dy1 = filtered[i].y - filtered[i - 1].y;
    const dx2 = filtered[i + 1].x - filtered[i].x;
    const dy2 = filtered[i + 1].y - filtered[i].y;

    const cross = dx1 * dy2 - dy1 * dx2;
    const dot = dx1 * dx2 + dy1 * dy2;
    if (Math.abs(dot) > 0.001 || Math.abs(cross) > 0.001) {
      totalAngle += Math.atan2(cross, dot);
    }
  }

  return totalAngle;
}

export function analyzeStroke(points: Point[]): StrokeAnalysis {
  const start = points[0];
  const end = points[points.length - 1];

  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  const netDx = end.x - start.x;
  const netDy = end.y - start.y;
  const netDisplacement = Math.sqrt(netDx * netDx + netDy * netDy);

  return {
    pathLength,
    netDx,
    netDy,
    netDisplacement,
    straightness: netDisplacement / Math.max(pathLength, 1),
    rotation: computeRotation(points),
  };
}

const MIN_STROKE_LENGTH = 40;
const MIN_ROTATION_ANGLE = Math.PI / 3;

export function validateStrokeDirection(
  stroke: StrokeAnalysis,
  rules: LetterDirectionRules,
): string | null {
  if (stroke.pathLength < MIN_STROKE_LENGTH) return null;

  const absDx = Math.abs(stroke.netDx);
  const absDy = Math.abs(stroke.netDy);

  if (
    rules.verticalDown &&
    absDy > absDx * 1.2 &&
    stroke.netDisplacement > MIN_STROKE_LENGTH
  ) {
    if (stroke.netDy < 0) {
      return 'Trace from top to bottom! ⬇️';
    }
  }

  if (
    rules.horizontalRight &&
    absDx > absDy * 1.2 &&
    stroke.netDisplacement > MIN_STROKE_LENGTH
  ) {
    if (stroke.netDx < 0) {
      return 'Trace from left to right! ➡️';
    }
  }

  if (
    rules.curveRotation &&
    stroke.straightness < 0.65 &&
    stroke.pathLength > MIN_STROKE_LENGTH * 1.5
  ) {
    if (Math.abs(stroke.rotation) > MIN_ROTATION_ANGLE) {
      const actual = stroke.rotation > 0 ? 'cw' : 'ccw';
      if (actual !== rules.curveRotation) {
        return 'Try tracing the curve the other way! ↺';
      }
    }
  }

  return null;
}
