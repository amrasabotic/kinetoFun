import { GAME_CONFIG } from '../game/constants.js';

// Exponential moving average smoother for MediaPipe landmark arrays
export class LandmarkSmoother {
  constructor(alpha = GAME_CONFIG.SMOOTHING_ALPHA) {
    this.alpha = alpha;
    this.prev = null;
  }

  smooth(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      this.prev = null;
      return landmarks;
    }
    if (!this.prev || this.prev.length !== landmarks.length) {
      this.prev = landmarks.map(lm => ({ ...lm }));
      return this.prev;
    }
    const out = landmarks.map((lm, i) => {
      const p = this.prev[i];
      return {
        x: p.x + this.alpha * (lm.x - p.x),
        y: p.y + this.alpha * (lm.y - p.y),
        z: p.z + this.alpha * ((lm.z ?? 0) - (p.z ?? 0)),
        visibility: lm.visibility ?? 0,
      };
    });
    this.prev = out;
    return out;
  }

  reset() {
    this.prev = null;
  }
}

// Tracks total movement between frames for freeze/pause detection
export class MotionTracker {
  constructor(windowSize = 10) {
    this.windowSize = windowSize;
    this.history = [];
    this.prev = null;
  }

  update(landmarks) {
    if (!landmarks || !this.prev) {
      this.prev = landmarks;
      return 0;
    }

    // Average movement across key joints
    const keyIndices = [0, 11, 12, 15, 16, 23, 24];
    let totalMove = 0;
    let count = 0;
    for (const i of keyIndices) {
      if (landmarks[i] && this.prev[i]) {
        const dx = landmarks[i].x - this.prev[i].x;
        const dy = landmarks[i].y - this.prev[i].y;
        totalMove += Math.sqrt(dx * dx + dy * dy);
        count++;
      }
    }

    this.prev = landmarks;
    const avgMove = count > 0 ? totalMove / count : 0;
    this.history.push(avgMove);
    if (this.history.length > this.windowSize) this.history.shift();
    return this.getAvgMotion();
  }

  getAvgMotion() {
    if (!this.history.length) return 0;
    return this.history.reduce((s, v) => s + v, 0) / this.history.length;
  }

  reset() {
    this.history = [];
    this.prev = null;
  }
}
