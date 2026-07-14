import { clamp, lerp } from '../utils/helpers';

/** EMA-smoothed cursor with a small jitter deadzone, isolated so hooks stay thin. */
export class CursorSmoother {
  private x = 0.5;
  private y = 0.5;
  private initialized = false;

  constructor(private smoothing = 0.35, private jitterDeadzone = 0.0025) {}

  update(rawX: number, rawY: number): { x: number; y: number } {
    if (!this.initialized) {
      this.x = rawX;
      this.y = rawY;
      this.initialized = true;
      return { x: this.x, y: this.y };
    }
    const dx = rawX - this.x;
    const dy = rawY - this.y;
    if (Math.hypot(dx, dy) < this.jitterDeadzone) {
      return { x: this.x, y: this.y };
    }
    this.x = lerp(this.x, rawX, clamp(this.smoothing, 0, 1));
    this.y = lerp(this.y, rawY, clamp(this.smoothing, 0, 1));
    return { x: this.x, y: this.y };
  }

  reset(x = 0.5, y = 0.5) {
    this.x = x;
    this.y = y;
    this.initialized = false;
  }
}

/** Tracks how long a boolean condition has held true/false, in ms — the primitive dwell timers build on. */
export class DurationTracker {
  private lastValue = false;
  private since = 0;

  update(value: boolean, nowMs: number): number {
    if (value !== this.lastValue) {
      this.lastValue = value;
      this.since = nowMs;
    }
    return value ? nowMs - this.since : 0;
  }
}
