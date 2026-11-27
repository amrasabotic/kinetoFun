export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

/** How far `time` is through the span from `start` to `end`, from 0 to 1. */
export const progress = (time: number, start: number, end: number) =>
  end <= start ? (time >= end ? 1 : 0) : clamp((time - start) / (end - start), 0, 1);

/** A CSS-style cubic-bezier timing function from (0, 0) to (1, 1). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (a: number, b: number, t: number) => 3 * a * (1 - t) * (1 - t) * t + 3 * b * (1 - t) * t * t + t * t * t;
  const slope = (a: number, b: number, t: number) =>
    3 * a * (1 - t) * (1 - t) + 6 * (b - a) * (1 - t) * t + 3 * (1 - b) * t * t;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= (curve(x1, x2, t) - x) / d;
    }
    // Newton can wander on flat stretches; bisection settles what it left.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 20 && Math.abs(curve(x1, x2, t) - x) > 1e-5; i++) {
      if (curve(x1, x2, t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return curve(y1, y2, t);
  };
}

/** Back-out: passes the target by about 10 % and settles, for things that land with weight. */
const popOut = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const s = 1.70158;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

export const ease = {
  /** Confident arrival: fast start, long soft landing. */
  enter: cubicBezier(0.16, 1, 0.3, 1),
  /** Camera moves and hand-overs: even acceleration and deceleration. */
  glide: cubicBezier(0.65, 0, 0.35, 1),
  /** Quick exits. */
  leave: cubicBezier(0.55, 0, 1, 0.45),
  /** A walk: gentle start and stop, so the steps never skate. */
  stroll: cubicBezier(0.4, 0, 0.6, 1),
  pop: popOut,
} as const;

/**
 * A damped spring's settle from 1 to 0 after an impulse at `since` seconds,
 * for wobbles that follow a landing.
 */
export const wobble = (since: number, frequency = 3, damping = 5) =>
  since <= 0 ? 0 : Math.exp(-damping * since) * Math.cos(2 * Math.PI * frequency * since);

/** A smooth 0 to 1 to 0 bump over the span, for blinks and pulses. */
export const bump = (time: number, start: number, end: number) => {
  const p = progress(time, start, end);
  return Math.sin(Math.PI * p);
};
