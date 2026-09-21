import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type TrackingStatus = 'initializing' | 'tracking' | 'no-camera' | 'error';

export interface RawHandFrame {
  handCount: number;
  cursorX: number; // index fingertip of the primary hand, mirrored
  cursorY: number;
}

const EMPTY: RawHandFrame = { handCount: 0, cursorX: 0.5, cursorY: 0.5 };

interface StartOptions {
  video: HTMLVideoElement;
  mirror: boolean;
  onFrame: (frame: RawHandFrame) => void;
  onStatus: (status: TrackingStatus) => void;
}

/**
 * Trivia Arena's only interaction is hover-dwell over an answer tile — the
 * hand shape never has to change mid-selection (unlike a fist/pinch
 * gesture), so there's no risk of the cursor jumping off its target the
 * way it did in Liquid Puzzle (ADR-057): tracking the raw index fingertip
 * is safe here and simpler than every other pose classifier this catalog
 * uses, since none of them are needed.
 */
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
      console.error('[gesture-trivia-arena] camera/model init failed', err);
      opts.onStatus('no-camera');
      return;
    }

    opts.onStatus('tracking');
    let lastMs = -1;

    function detect() {
      if (!alive || !landmarker) return;
      const vid = opts.video;
      if (vid && vid.readyState >= 2 && vid.currentTime !== lastMs) {
        lastMs = vid.currentTime;
        const res = landmarker.detectForVideo(vid, performance.now());
        const landmarks: NormalizedLandmark[][] = res.landmarks ?? [];

        if (landmarks.length === 0) {
          opts.onFrame(EMPTY);
        } else {
          const tip = landmarks[0][8];
          const rawX = tip.x;
          const cursorX = opts.mirror ? 1 - rawX : rawX;
          opts.onFrame({ handCount: landmarks.length, cursorX, cursorY: tip.y });
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
