import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface HandData {
  detected: boolean;
  x: number;   // wrist X, 0–1 normalized, mirrored (selfie-view)
  y: number;   // wrist Y, 0–1 normalized
  vy: number;  // downward velocity (positive = moving down)
}

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement>): HandData {
  const [hand, setHand] = useState<HandData>({ detected: false, x: 0.5, y: 0.5, vy: 0 });
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(-1);
  const prevYRef = useRef<number>(0.5);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const lm = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    if (video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const results = lm.detectForVideo(video, performance.now());
      if (results.landmarks?.length > 0) {
        const wrist = results.landmarks[0][0];
        const x = 1 - wrist.x;
        const y = wrist.y;
        const vy = y - prevYRef.current;
        prevYRef.current = y;
        setHand({ detected: true, x, y, vy });
      } else {
        prevYRef.current = 0.5;
        setHand(prev => ({ ...prev, detected: false, vy: 0 }));
      }
    }
    rafRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      if (cancelled) return;
      const lmr = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      if (cancelled) return;
      landmarkerRef.current = lmr;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      const video = videoRef.current;
      if (video) { video.srcObject = stream; video.play(); }
      rafRef.current = requestAnimationFrame(detect);
    }
    init().catch(console.error);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      const video = videoRef.current;
      if (video?.srcObject) (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      landmarkerRef.current?.close();
    };
  }, [detect, videoRef]);

  return hand;
}
