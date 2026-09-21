import { useEffect, useRef } from 'react';
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

export interface HandData {
  // Normalized 0-1 palm center (landmark 9)
  palmX: number;
  palmY: number;
  // Wrist
  wristX: number;
  wristY: number;
  // Gesture flags
  isFist: boolean;
  isPinch: boolean;
  isOpen: boolean;
  detected: boolean;
  // Raw landmarks for advanced use
  landmarks: { x: number; y: number; z: number }[];
}

const EMPTY_HAND: HandData = {
  palmX: 0.5, palmY: 0.5,
  wristX: 0.5, wristY: 0.5,
  isFist: false, isPinch: false, isOpen: false,
  detected: false,
  landmarks: [],
};

export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement>,
): React.MutableRefObject<HandData> {
  const handRef = useRef<HandData>({ ...EMPTY_HAND });
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );
        const hl = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (destroyed) { hl.close(); return; }
        landmarkerRef.current = hl;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (destroyed) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current!;
        video.srcObject = stream;
        video.onloadedmetadata = () => { video.play(); loop(); };
      } catch (e) {
        console.warn('[MediaPipe] init failed', e);
      }
    }

    function loop() {
      if (destroyed || !landmarkerRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }

      try {
        const result: HandLandmarkerResult = landmarkerRef.current.detectForVideo(video, performance.now());
        if (result.landmarks.length > 0) {
          const lm = result.landmarks[0];
          handRef.current = parseHand(lm);
        } else {
          handRef.current = { ...EMPTY_HAND };
        }
      } catch { /* ignore mid-destroy errors */ }

      rafRef.current = requestAnimationFrame(loop);
    }

    init();

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      const v = videoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []);

  return handRef;
}

function parseHand(lm: { x: number; y: number; z: number }[]): HandData {
  if (lm.length < 21) return { ...EMPTY_HAND };

  const palm = lm[9];
  const wrist = lm[0];

  // Finger curl detection (fingertip vs MCP joint)
  const fingerTips  = [4, 8, 12, 16, 20];
  const fingerMCPs  = [2, 5, 9, 13, 17];

  const curled = fingerTips.map((tip, i) => lm[tip].y > lm[fingerMCPs[i]].y);
  const fistCount = curled.filter(Boolean).length;

  // Thumb-index pinch
  const thumbTip = lm[4];
  const indexTip = lm[8];
  const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

  return {
    palmX: palm.x,
    palmY: palm.y,
    wristX: wrist.x,
    wristY: wrist.y,
    isFist: fistCount >= 4,
    isPinch: pinchDist < 0.06,
    isOpen: fistCount <= 1,
    detected: true,
    landmarks: lm,
  };
}
