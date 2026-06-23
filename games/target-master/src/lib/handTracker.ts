import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

let landmarkerPromise: Promise<HandLandmarker> | null = null;

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
      );
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        // Lower thresholds = more forgiving tracking, fewer "lost hand" gaps.
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });
      return landmarker;
    })();
  }
  return landmarkerPromise;
}

export type HandState = {
  /** 0..1, mirrored x (so moving hand right moves cursor right) */
  x: number;
  y: number;
  /** true when fist is closed */
  closed: boolean;
  /** rough openness 0..1 */
  openness: number;
  /** timestamp of detection */
  t: number;
};

/**
 * Compute a fist-closed signal from landmarks.
 * Uses palm + wrist average for a stable cursor anchor.
 */
export function readHand(result: HandLandmarkerResult): HandState | null {
  const lm = result.landmarks?.[0];
  if (!lm || lm.length < 21) return null;

  const wrist = lm[0];
  const mcps = [lm[5], lm[9], lm[13], lm[17]];
  const palmX = mcps.reduce((s, p) => s + p.x, 0) / mcps.length;
  const palmY = mcps.reduce((s, p) => s + p.y, 0) / mcps.length;

  const tips = [lm[8], lm[12], lm[16], lm[20]];
  const palmSize = Math.hypot(mcps[0].x - mcps[3].x, mcps[0].y - mcps[3].y) || 0.0001;

  let openSum = 0;
  for (const t of tips) {
    openSum += Math.hypot(t.x - palmX, t.y - palmY) / palmSize;
  }
  const openness = openSum / tips.length;
  const closed = openness < 1.1;

  // Mirror X (selfie view)
  const x = 1 - (palmX * 0.6 + wrist.x * 0.4);
  const y = palmY * 0.6 + wrist.y * 0.4;

  return {
    x,
    y,
    closed,
    openness: Math.max(0, Math.min(1, (openness - 0.7) / 1.2)),
    t: performance.now(),
  };
}

/**
 * One-Euro-style adaptive smoother: heavy smoothing when slow (kills jitter),
 * light smoothing when fast (kills lag). Keeps cursor glued to the hand.
 */
export class HandSmoother {
  private x = 0.5;
  private y = 0.5;
  private vx = 0;
  private vy = 0;
  private initialized = false;
  private lastT = 0;

  update(nx: number, ny: number, now: number) {
    if (!this.initialized) {
      this.x = nx;
      this.y = ny;
      this.lastT = now;
      this.initialized = true;
      return { x: this.x, y: this.y };
    }
    const dt = Math.max(0.001, (now - this.lastT) / 1000);
    this.lastT = now;
    const dx = nx - this.x;
    const dy = ny - this.y;
    const speed = Math.hypot(dx, dy) / dt; // units / s in [0..1] space
    // alpha: 0.25 when still, up to 0.9 when moving fast
    const alpha = Math.min(0.9, 0.25 + speed * 1.6);
    this.x += dx * alpha;
    this.y += dy * alpha;
    this.vx = dx / dt;
    this.vy = dy / dt;
    return { x: this.x, y: this.y };
  }

  /** When detection drops, coast forward briefly using last velocity. */
  predict(now: number) {
    if (!this.initialized) return { x: this.x, y: this.y };
    const dt = Math.min(0.1, (now - this.lastT) / 1000);
    return {
      x: Math.max(0, Math.min(1, this.x + this.vx * dt * 0.5)),
      y: Math.max(0, Math.min(1, this.y + this.vy * dt * 0.5)),
    };
  }

  get value() {
    return { x: this.x, y: this.y };
  }
}
