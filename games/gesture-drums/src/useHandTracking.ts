import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface HandData {
  detected: boolean;
  x: number;        // 0–1 normalized, mirrored
  y: number;        // 0–1 normalized
  vy: number;       // downward velocity in canvas pixels/frame (positive = moving down)
  handedness: 'Left' | 'Right';
}

export interface BothHandsData {
  left: HandData | null;
  right: HandData | null;
}

const CANVAS_H = 600;

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement>): BothHandsData {
  const [handsData, setHandsData] = useState<BothHandsData>({ left: null, right: null });
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  // Previous Y positions for velocity computation
  const prevYRef = useRef<{ Left: number; Right: number }>({ Left: 0.5, Right: 0.5 });

  const detect = useCallback(() => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const results = landmarker.detectForVideo(video, performance.now());

      const newHands: BothHandsData = { left: null, right: null };

      if (results.landmarks && results.landmarks.length > 0) {
        results.landmarks.forEach((lm, i) => {
          // MediaPipe reports handedness relative to the image (mirrored camera)
          // "Right" in MediaPipe = player's left hand; flip for natural feel
          const rawHandedness = results.handednesses[i]?.[0]?.categoryName ?? 'Right';
          const handedness: 'Left' | 'Right' = rawHandedness === 'Right' ? 'Left' : 'Right';

          // Use wrist (lm[0]) for stable position tracking
          const wrist = lm[0];
          const x = 1 - wrist.x; // mirror X
          const y = wrist.y;

          const prevY = prevYRef.current[handedness];
          const vy = (y - prevY) * CANVAS_H; // pixels/frame, positive = moving down
          prevYRef.current[handedness] = y;

          const hand: HandData = { detected: true, x, y, vy, handedness };
          if (handedness === 'Left') newHands.left = hand;
          else newHands.right = hand;
        });
      }

      setHandsData(newHands);
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      if (cancelled) return;
      const lm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      if (cancelled) return;
      handLandmarkerRef.current = lm;

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (cancelled) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play();
      }
      animFrameRef.current = requestAnimationFrame(detect);
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      const video = videoRef.current;
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      handLandmarkerRef.current?.close();
    };
  }, [detect, videoRef]);

  return handsData;
}
