import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  detected: boolean;
  /** Mirrored (1 - x) normalized 0-1 wrist position — used for menu-cursor + direction zone. */
  x: number;
  y: number;
  /** Mirrored palm center (landmark 9) — more stable than the wrist across gestures. */
  palmX: number;
  palmY: number;
  isFist: boolean;
  isOpen: boolean;
  isPinch: boolean;
  isThumbsUp: boolean;
  isVictory: boolean;
  landmarks: Landmark[];
  confidence: number;
}

export type CameraStatus = 'initializing' | 'ready' | 'denied' | 'unavailable' | 'lost';

const EMPTY_HAND: HandData = {
  detected: false,
  x: 0.5,
  y: 0.5,
  palmX: 0.5,
  palmY: 0.5,
  isFist: false,
  isOpen: false,
  isPinch: false,
  isThumbsUp: false,
  isVictory: false,
  landmarks: [],
  confidence: 0,
};

function dist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function parseHand(lm: Landmark[]): HandData {
  if (lm.length < 21) return { ...EMPTY_HAND };

  const wrist = lm[0];
  const palm = lm[9];
  const tips = [4, 8, 12, 16, 20];
  const pips = [3, 6, 10, 14, 18];
  const mcps = [2, 5, 9, 13, 17];

  // A finger counts "curled" when its tip sits closer to the wrist than its own PIP joint.
  const curled = tips.map((tip, i) => dist(lm[tip], wrist) < dist(lm[pips[i]], wrist));
  const [thumbCurled, indexCurled, middleCurled, ringCurled, pinkyCurled] = curled;
  const curledCount = curled.filter(Boolean).length;

  const pinchDist = dist(lm[4], lm[8]);
  const handSpan = dist(lm[0], lm[9]) || 0.001;

  const thumbExtendedUp = !thumbCurled && lm[4].y < lm[2].y - 0.02 && lm[4].y < wrist.y - 0.05;
  const isThumbsUp = thumbExtendedUp && indexCurled && middleCurled && ringCurled && pinkyCurled;

  const indexUp = lm[8].y < lm[6].y - 0.01;
  const middleUp = lm[12].y < lm[10].y - 0.01;
  const isVictory = indexUp && middleUp && ringCurled && pinkyCurled && !thumbExtendedUp;

  // Rough per-frame tracking confidence from mean tip->MCP visibility spread (cheap proxy — no z depth reliance).
  const spread = tips.reduce((acc, tip, i) => acc + dist(lm[tip], lm[mcps[i]]), 0) / (5 * handSpan);
  const confidence = Math.max(0, Math.min(1, spread));

  return {
    detected: true,
    x: 1 - wrist.x,
    y: wrist.y,
    palmX: 1 - palm.x,
    palmY: palm.y,
    isFist: curledCount >= 4,
    isOpen: curledCount <= 1,
    isPinch: pinchDist < 0.055,
    isThumbsUp,
    isVictory,
    landmarks: lm,
    confidence,
  };
}

const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

export function useMediaPipe(videoRef: React.RefObject<HTMLVideoElement>) {
  const handRef = useRef<HandData>({ ...EMPTY_HAND });
  const [status, setStatus] = useState<CameraStatus>('initializing');
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef(0);
  const lastSeenRef = useRef(0);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const hl = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (destroyed) {
          hl.close();
          return;
        }
        landmarkerRef.current = hl;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (destroyed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          setStatus('ready');
          lastSeenRef.current = performance.now();
          loop();
        };
      } catch (err) {
        const name = (err as { name?: string })?.name;
        setStatus(name === 'NotAllowedError' || name === 'PermissionDeniedError' ? 'denied' : 'unavailable');
      }
    }

    function loop() {
      if (destroyed || !landmarkerRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      try {
        const result: HandLandmarkerResult = landmarkerRef.current.detectForVideo(video, performance.now());
        if (result.landmarks.length > 0) {
          handRef.current = parseHand(result.landmarks[0] as Landmark[]);
          lastSeenRef.current = performance.now();
          setStatus('ready');
        } else {
          handRef.current = { ...EMPTY_HAND };
          if (performance.now() - lastSeenRef.current > 3000) setStatus('lost');
        }
      } catch {
        /* transient decode error — keep last known hand state */
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    init();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      const v = videoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { handRef, status };
}
