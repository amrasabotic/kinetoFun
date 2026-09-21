import { useEffect, useRef } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';

export interface HandData {
  detected: boolean;
  landmarks: NormalizedLandmark[];
  /** Palm centre X in [0,1], mirror-flipped (for cursor / menu navigation) */
  cursorX: number;
  /** Palm centre Y in [0,1] */
  cursorY: number;
}

const EMPTY: HandData = { detected: false, landmarks: [], cursorX: 0.5, cursorY: 0.5 };

function palmCenter(lm: NormalizedLandmark[]): { x: number; y: number } {
  const pts = [lm[0], lm[5], lm[9], lm[13], lm[17]];
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: 1 - x, y }; // mirror X
}

/**
 * Runs MediaPipe Hand Landmarker in a RAF loop.
 * Returns a stable ref — never triggers React re-renders, safe to read in a game loop.
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
        minHandDetectionConfidence: 0.75,
        minHandPresenceConfidence: 0.75,
        minTrackingConfidence: 0.75,
        runningMode: 'VIDEO',
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      const vid = videoRef.current;
      if (!vid || !alive) return;
      vid.srcObject = stream;
      await vid.play();

      let lastMs = -1;
      function detect() {
        if (!alive || !landmarker) return;
        const vid2 = videoRef.current;
        if (vid2 && vid2.readyState >= 2 && vid2.currentTime !== lastMs) {
          lastMs = vid2.currentTime;
          const res = landmarker.detectForVideo(vid2, performance.now());
          if (res.landmarks && res.landmarks.length > 0) {
            const lm = res.landmarks[0];
            dataRef.current = {
              detected: true,
              landmarks: lm,
              cursorX: 1 - lm[8].x,  // index fingertip, mirror X
              cursorY: lm[8].y,
            };
          } else {
            dataRef.current = EMPTY;
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
        (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [videoRef]);

  return dataRef;
}

// ── Lightweight version for menu screens (triggers re-renders) ────────────────
import { useState } from 'react';

export interface MenuHandData {
  detected: boolean;
  x: number;   // normalised [0,1], mirror-flipped palm centre
  y: number;
}

export function useMenuHand(videoRef: React.RefObject<HTMLVideoElement>): MenuHandData {
  const [data, setData] = useState<MenuHandData>({ detected: false, x: 0.5, y: 0.5 });

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let rafId = 0;
    let alive = true;

    async function init() {
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
        minHandDetectionConfidence: 0.75,
        minHandPresenceConfidence: 0.75,
        minTrackingConfidence: 0.75,
        runningMode: 'VIDEO',
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      const vid = videoRef.current;
      if (!vid || !alive) return;
      vid.srcObject = stream;
      await vid.play();

      let sx = 0.5, sy = 0.5;
      let lastMs = -1;

      function detect() {
        if (!alive || !landmarker) return;
        const vid2 = videoRef.current;
        if (vid2 && vid2.readyState >= 2 && vid2.currentTime !== lastMs) {
          lastMs = vid2.currentTime;
          const res = landmarker.detectForVideo(vid2, performance.now());
          if (res.landmarks && res.landmarks.length > 0) {
            const lm = res.landmarks[0];
            const rx = 1 - lm[8].x;  // index fingertip, mirror X
            const ry = lm[8].y;
            sx = sx + (rx - sx) * 0.28;
            sy = sy + (ry - sy) * 0.28;
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
        (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [videoRef]);

  return data;
}
