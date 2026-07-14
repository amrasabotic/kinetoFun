import { useEffect, useRef, useState } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

export interface HandData {
  detected: boolean;
  landmarks: NormalizedLandmark[];
  /** Index fingertip X in [0,1], mirror-flipped */
  cursorX: number;
  /** Index fingertip Y in [0,1] */
  cursorY: number;
}

const EMPTY: HandData = { detected: false, landmarks: [], cursorX: 0.5, cursorY: 0.5 };

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function createLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
    numHands: 1,
    minHandDetectionConfidence: 0.7,
    minHandPresenceConfidence: 0.7,
    minTrackingConfidence: 0.7,
    runningMode: 'VIDEO',
  });
}

async function startCamera(videoRef: React.RefObject<HTMLVideoElement>): Promise<boolean> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 640, height: 480 },
  });
  const vid = videoRef.current;
  if (!vid) return false;
  vid.srcObject = stream;
  await vid.play();
  return true;
}

/**
 * Ref-based hand tracker for the game loop. Never triggers React re-renders —
 * read `.current` inside requestAnimationFrame.
 */
export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement>,
): React.MutableRefObject<HandData> {
  const dataRef = useRef<HandData>(EMPTY);

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let rafId = 0;
    let alive = true;

    async function init() {
      landmarker = await createLandmarker();
      const ok = await startCamera(videoRef);
      if (!ok || !alive) return;

      let lastMs = -1;
      function detect() {
        if (!alive || !landmarker) return;
        const vid = videoRef.current;
        if (vid && vid.readyState >= 2 && vid.currentTime !== lastMs) {
          lastMs = vid.currentTime;
          const res = landmarker.detectForVideo(vid, performance.now());
          if (res.landmarks && res.landmarks.length > 0) {
            const lm = res.landmarks[0];
            dataRef.current = {
              detected: true,
              landmarks: lm,
              cursorX: 1 - lm[8].x,
              cursorY: lm[8].y,
            };
          } else {
            dataRef.current = { ...EMPTY };
          }
        }
        rafId = requestAnimationFrame(detect);
      }
      rafId = requestAnimationFrame(detect);
    }

    init().catch(console.error);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      landmarker?.close();
      const vid = videoRef.current;
      if (vid?.srcObject) {
        (vid.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [videoRef]);

  return dataRef;
}

// ── Menu hand (state-based, smoothed) ─────────────────────────────────────────

export interface MenuHandData {
  detected: boolean;
  x: number; // normalised [0,1], mirror-flipped index fingertip
  y: number;
}

export function useMenuHand(videoRef: React.RefObject<HTMLVideoElement>): MenuHandData {
  const [data, setData] = useState<MenuHandData>({ detected: false, x: 0.5, y: 0.5 });

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let rafId = 0;
    let alive = true;

    async function init() {
      landmarker = await createLandmarker();
      const ok = await startCamera(videoRef);
      if (!ok || !alive) return;

      let sx = 0.5, sy = 0.5;
      let lastMs = -1;
      function detect() {
        if (!alive || !landmarker) return;
        const vid = videoRef.current;
        if (vid && vid.readyState >= 2 && vid.currentTime !== lastMs) {
          lastMs = vid.currentTime;
          const res = landmarker.detectForVideo(vid, performance.now());
          if (res.landmarks && res.landmarks.length > 0) {
            const lm = res.landmarks[0];
            const rx = 1 - lm[8].x;
            const ry = lm[8].y;
            sx = sx + (rx - sx) * 0.3;
            sy = sy + (ry - sy) * 0.3;
            setData({ detected: true, x: sx, y: sy });
          } else {
            setData({ detected: false, x: sx, y: sy });
          }
        }
        rafId = requestAnimationFrame(detect);
      }
      rafId = requestAnimationFrame(detect);
    }

    init().catch(console.error);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      landmarker?.close();
      const vid = videoRef.current;
      if (vid?.srcObject) {
        (vid.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [videoRef]);

  return data;
}
