// Angle at vertex B formed by points A-B-C, in degrees [0..180]
export function angleDeg(a, b, c) {
  const abx = a.x - b.x, aby = a.y - b.y;
  const cbx = c.x - b.x, cby = c.y - b.y;
  const dot   = abx * cbx + aby * cby;
  const cross = Math.abs(abx * cby - aby * cbx);
  return Math.atan2(cross, dot) * (180 / Math.PI);
}

// Euclidean distance in 2D
export function dist2d(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Linear interpolation
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Clamp value to [min, max]
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Map angle error to a partial score [0..1] with given tolerance
export function angleSimilarity(actual, target, tolerance) {
  const err = Math.abs(actual - target);
  if (err <= tolerance * 0.5) return 1;
  if (err >= tolerance * 2.5) return 0;
  return clamp(1 - (err - tolerance * 0.5) / (tolerance * 2), 0, 1);
}

// Average of an array of numbers
export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// Standard deviation
export function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map(v => (v - m) ** 2)));
}
