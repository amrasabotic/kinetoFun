import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { HandFrame } from '../types';

export type TrackingStatus = 'initializing' | 'tracking' | 'no-camera' | 'error';

const EMPTY_FRAME: HandFrame = { detected: false, confidence: 0, cursorX: 0.5, cursorY: 0.5, isPinching: false };

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Cursor is tracked from the palm center (wrist + MCP knuckles), not the
 * index fingertip. The fingertip moves substantially as the fingers close
 * into a pinch, which would drag the cursor off whatever it was hovering
 * right at the moment a grab is attempted — a real bug hit and fixed in
 * Liquid Puzzle (ADR-057) for the same reason with a fist gesture. The
 * palm's knuckle structure barely moves regardless of finger pose, so this
 * game's tower-placement pinch never suffers the same failure.
 */
function classify(lm: NormalizedLandmark[], mirror: boolean): { cursorX: number; cursorY: number; pinchDist: number } {
  const wrist = lm[0];
  const midMcp = lm[9];
  const handScale = Math.max(0.02, dist(wrist, midMcp));
  const palmPts = [lm[0], lm[5], lm[9], lm[13], lm[17]];
  const palmX = palmPts.reduce((s, p) => s + p.x, 0) / palmPts.length;
  const palmY = palmPts.reduce((s, p) => s + p.y, 0) / palmPts.length;

  return {
    cursorX: mirror ? 1 - palmX : palmX,
    cursorY: palmY,
    pinchDist: dist(lm[4], lm[8]) / handScale,
  };
}

interface StartOptions {
  video: HTMLVideoElement;
  mirror: boolean;
  smoothing: number; // EMA alpha, 0..1 (higher = snappier)
  /** Settings.gestureSensitivity (0..1), read live each frame — higher widens the pinch trigger distance. */
  pinchSensitivityRef: { current: number };
  onFrame: (frame: HandFrame) => void;
  onStatus: (status: TrackingStatus) => void;
}

export function startHandTracking(opts: StartOptions): () => void {
  let landmarker: HandLandmarker | null = null;
  let rafId = 0;
  let alive = true;
  let sx = 0.5;
  let sy = 0.5;
  let stream: MediaStream | null = null;

  async function init() {
    opts.onStatus('initializing');
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
      );
      landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        numHands: 1,
        minHandDetectionConfidence: 0.7,
        minHandPresenceConfidence: 0.7,
        minTrackingConfidence: 0.7,
        runningMode: 'VIDEO',
      });

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 960, height: 540 },
      });
      if (!alive) return;
      opts.video.srcObject = stream;
      await opts.video.play();
    } catch (err) {
      console.error('[gesture-tower-defense] camera/model init failed', err);
      opts.onStatus('no-camera');
      return;
    }

    opts.onStatus('tracking');
    let lastMs = -1;
    let pinching = false;

    function detect() {
      if (!alive || !landmarker) return;
      const vid = opts.video;
      if (vid && vid.readyState >= 2 && vid.currentTime !== lastMs) {
        lastMs = vid.currentTime;
        const res = landmarker.detectForVideo(vid, performance.now());
        if (res.landmarks && res.landmarks.length > 0) {
          const lm = res.landmarks[0];
          const c = classify(lm, opts.mirror);
          const a = opts.smoothing;
          sx = sx + (c.cursorX - sx) * a;
          sy = sy + (c.cursorY - sy) * a;

          // A looser sensitivity setting widens both the trigger and
          // release distance together, preserving the hysteresis gap so
          // pinch detection never chatters right at the boundary.
          const pinchOn = 0.3 + opts.pinchSensitivityRef.current * 0.15;
          const pinchOff = pinchOn + 0.1;
          if (pinching) {
            if (c.pinchDist > pinchOff) pinching = false;
          } else if (c.pinchDist < pinchOn) {
            pinching = true;
          }

          const confidence = res.handednesses?.[0]?.[0]?.score ?? 0.8;
          opts.onFrame({ detected: true, confidence, cursorX: sx, cursorY: sy, isPinching: pinching });
        } else {
          pinching = false;
          opts.onFrame({ ...EMPTY_FRAME, cursorX: sx, cursorY: sy });
        }
      }
      rafId = requestAnimationFrame(detect);
    }
    rafId = requestAnimationFrame(detect);
  }

  init();

  return () => {
    alive = false;
    cancelAnimationFrame(rafId);
    landmarker?.close();
    stream?.getTracks().forEach((t) => t.stop());
  };
}
