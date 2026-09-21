import type { Point } from '../types';

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface PreparedPath {
  points: Point[];
  cumulative: number[]; // cumulative arc-length up to each point, cumulative[0] = 0
  totalLength: number;
}

/** Precomputes cumulative arc length so enemy movement is at a constant real speed regardless of how segment lengths vary along a hand-authored path. */
export function preparePath(points: Point[]): PreparedPath {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + dist(points[i - 1], points[i]));
  }
  return { points, cumulative, totalLength: cumulative[cumulative.length - 1] };
}

/** Position at fractional progress (0..1) along the path, interpolated linearly within the containing segment. */
export function pointAtProgress(prepared: PreparedPath, progress: number): Point {
  const { points, cumulative, totalLength } = prepared;
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1 || totalLength === 0) return points[0];

  const targetLen = Math.max(0, Math.min(1, progress)) * totalLength;
  let i = 1;
  while (i < cumulative.length && cumulative[i] < targetLen) i++;
  i = Math.min(i, points.length - 1);

  const segStart = cumulative[i - 1];
  const segLen = cumulative[i] - segStart;
  const t = segLen === 0 ? 0 : (targetLen - segStart) / segLen;
  const a = points[i - 1];
  const b = points[i];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
