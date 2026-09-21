/**
 * MediaPipe hand-tracking hook.
 * Returns a stable ref (no re-renders) safe to read every game-loop frame.
 * Also exports useMenuHand which re-renders for cursor positioning in menus.
 */
import { useEffect, useRef, useState } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { HandData } from '../types';

const EMPTY_HAND: HandData = {
  detected: false,
  landmarks: [],
  palmY: 0.5,
  palmX: 0.5,
  isFist: false,
  isOpen: false,
};

// Average of wrist + base knuckles for stable palm position
function palmCenter(lm: NormalizedLandmark[]): { x: number; y: number } {
  const pts = [lm[0], lm[5], lm[9], lm[13], lm[17]];
  const x   = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y   = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: 1 - x, y }; // mirror X so it feels natural
}

function detectFist(lm: NormalizedLandmark[]): boolean {
  if (lm.length < 21) return false;
  const curled = [
    lm[8].y  > lm[6].y,
    lm[12].y > lm[10].y,
    lm[16].y > lm[14].y,
    lm[20].y > lm[18].y,
  ];
  return curled.filter(Boolean).length >= 3;
}

function detectOpen(lm: NormalizedLandmark[]): boolean {
  if (lm.length < 21) return false;
  const extended = [
    lm[8].y  < lm[6].y,
    lm[12].y < lm[10].y,
    lm[16].y < lm[14].y,
    lm[20].y < lm[18].y,
  ];
  return extended.filter(Boolean).length >= 3;
}

async function createLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
  );
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',
    },
    numHands: 1,
    minHandDetectionConfidence: 0.7,
    minHandPresenceConfidence:  0.7,
    minTrackingConfidence:      0.65,
    runningMode: 'VIDEO',
  });
}

/**
 * Primary hook for in-game hand tracking.
 * Updates a ref every RAF frame — never triggers React re-renders.
 */
export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement>,
): React.MutableRefObject<HandData> {
  const dataRef = useRef<HandData>(EMPTY_HAND);

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let rafId  = 0;
    let alive  = true;
    let lastTs = -1;

    async function init() {
      landmarker = await createLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      const vid = videoRef.current;
      if (!vid || !alive) return;
      vid.srcObject = stream;
      await vid.play();

      function detect() {
        if (!alive || !landmarker) return;
        const vid2 = videoRef.current;
        if (vid2 && vid2.readyState >= 2 && vid2.currentTime !== lastTs) {
          lastTs = vid2.currentTime;
          const res = landmarker.detectForVideo(vid2, performance.now());
          if (res.landmarks?.length) {
            const lm      = res.landmarks[0];
            const { x, y } = palmCenter(lm);
            dataRef.current = {
              detected: true,
              landmarks: lm,
              palmX:   x,
              palmY:   y,
              isFist:  detectFist(lm),
              isOpen:  detectOpen(lm),
            };
          } else {
            dataRef.current = EMPTY_HAND;
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

// ── Menu cursor variant (triggers React re-renders) ───────────────────────────

export interface MenuHandState {
  detected: boolean;
  x: number;   // normalised [0,1], mirrored palm X
  y: number;
}

export function useMenuHand(
  videoRef: React.RefObject<HTMLVideoElement>,
): MenuHandState {
  const [state, setState] = useState<MenuHandState>({ detected: false, x: 0.5, y: 0.5 });

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let rafId  = 0;
    let alive  = true;
    let lastTs = -1;
    let sx = 0.5, sy = 0.5;

    async function init() {
      landmarker = await createLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      const vid = videoRef.current;
      if (!vid || !alive) return;
      vid.srcObject = stream;
      await vid.play();

      function detect() {
        if (!alive || !landmarker) return;
        const vid2 = videoRef.current;
        if (vid2 && vid2.readyState >= 2 && vid2.currentTime !== lastTs) {
          lastTs = vid2.currentTime;
          const res = landmarker.detectForVideo(vid2, performance.now());
          if (res.landmarks?.length) {
            const lm      = res.landmarks[0];
            const { x, y } = palmCenter(lm);
            sx = sx + (x - sx) * 0.3;
            sy = sy + (y - sy) * 0.3;
            setState({ detected: true, x: sx, y: sy });
          } else {
            setState({ detected: false, x: sx, y: sy });
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

  return state;
}
