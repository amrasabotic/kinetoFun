import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface PinchData {
  detected: boolean;
  pinching: boolean;
  x: number;       // pinch midpoint X, 0–1 normalized, mirrored
  y: number;       // pinch midpoint Y, 0–1 normalized
  wristX: number;  // wrist X for cursor display
  wristY: number;
}

// Normalized distance between thumb tip and index tip that counts as a pinch
const PINCH_THRESHOLD = 0.075;

export function usePinchTracking(videoRef: React.RefObject<HTMLVideoElement>): PinchData {
  const [data, setData] = useState<PinchData>({
    detected: false, pinching: false,
    x: 0.5, y: 0.5, wristX: 0.5, wristY: 0.5,
  });
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(-1);

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
        const landmarks = results.landmarks[0];
        const thumb = landmarks[4];   // thumb tip
        const index = landmarks[8];   // index tip
        const wrist = landmarks[0];

        const dx = thumb.x - index.x;
        const dy = thumb.y - index.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pinching = dist < PINCH_THRESHOLD;

        const midX = (thumb.x + index.x) / 2;
        const midY = (thumb.y + index.y) / 2;

        setData({
          detected: true,
          pinching,
          x: 1 - midX,
          y: midY,
          wristX: 1 - wrist.x,
          wristY: wrist.y,
        });
      } else {
        setData(prev => ({ ...prev, detected: false, pinching: false }));
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
      const lm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      if (cancelled) return;
      landmarkerRef.current = lm;
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

  return data;
}
