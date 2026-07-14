import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type TrackingStatus = 'initializing' | 'tracking' | 'no-camera' | 'error';

export interface RawHandFrame {
  handCount: number;
  cursorX: number; // index fingertip of the primary hand, mirrored
  cursorY: number;
  isPalmOpen: boolean;
  isFist: boolean;
  isPinching: boolean; // thumb tip + index tip pressed together ("pick")
  bothHandsOpenAndRaised: boolean;
}

const EMPTY: RawHandFrame = {
  handCount: 0,
  cursorX: 0.5,
  cursorY: 0.5,
  isPalmOpen: false,
  isFist: false,
  isPinching: false,
  bothHandsOpenAndRaised: false,
};

// Pinch uses its own (looser) threshold + hysteresis gap so it doesn't
// chatter on/off at the boundary while the fingers hover near the trigger distance.
const PINCH_ON = 0.35;
const PINCH_OFF = 0.45;

function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function classifyHand(lm: NormalizedLandmark[]) {
  const wrist = lm[0];
  const midMcp = lm[9];
  const handScale = Math.max(0.02, dist(wrist, midMcp));
  const palmPts = [lm[0], lm[5], lm[9], lm[13], lm[17]];
  const palmX = palmPts.reduce((s, p) => s + p.x, 0) / palmPts.length;
  const palmY = palmPts.reduce((s, p) => s + p.y, 0) / palmPts.length;
  const tips = [lm[8], lm[12], lm[16], lm[20]];
  const avgTipDist = tips.reduce((s, t) => s + Math.hypot(t.x - palmX, t.y - palmY), 0) / tips.length;
  const spread = avgTipDist / handScale;
  const pinchDist = dist(lm[4], lm[8]) / handScale;
  return {
    indexX: lm[8].x,
    indexY: lm[8].y,
    wristY: wrist.y,
    isPalmOpen: spread > 1.15,
    isFist: spread < 0.55,
    pinchDist,
  };
}

interface StartOptions {
  video: HTMLVideoElement;
  mirror: boolean;
  onFrame: (frame: RawHandFrame) => void;
  onStatus: (status: TrackingStatus) => void;
}

export function startHandTracking(opts: StartOptions): () => void {
  let landmarker: HandLandmarker | null = null;
  let rafId = 0;
  let alive = true;
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
        numHands: 2,
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
      console.error('[word-search-hidden-words] camera/model init failed', err);
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
        const landmarks = res.landmarks ?? [];

        if (landmarks.length === 0) {
          pinching = false;
          opts.onFrame(EMPTY);
        } else {
          // Primary hand = first detected hand, used for cursor control.
          const primary = classifyHand(landmarks[0]);
          const rawX = primary.indexX;
          const cursorX = opts.mirror ? 1 - rawX : rawX;

          if (pinching) {
            if (primary.pinchDist > PINCH_OFF) pinching = false;
          } else if (primary.pinchDist < PINCH_ON) {
            pinching = true;
          }

          const raisedCount = landmarks.filter((lm) => classifyHand(lm).wristY < 0.55).length;
          const openCount = landmarks.filter((lm) => classifyHand(lm).isPalmOpen).length;

          opts.onFrame({
            handCount: landmarks.length,
            cursorX,
            cursorY: primary.indexY,
            isPalmOpen: primary.isPalmOpen,
            isFist: primary.isFist,
            isPinching: pinching,
            bothHandsOpenAndRaised: landmarks.length === 2 && raisedCount === 2 && openCount === 2,
          });
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
