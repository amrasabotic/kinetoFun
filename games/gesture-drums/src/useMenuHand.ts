import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface MenuHandData {
  detected: boolean;
  x: number; // 0–1 normalized, mirrored
  y: number; // 0–1 normalized
}

export function useMenuHand(videoRef: React.RefObject<HTMLVideoElement>): MenuHandData {
  const [hand, setHand] = useState<MenuHandData>({ detected: false, x: 0.5, y: 0.5 });
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
        const wrist = results.landmarks[0][0];
        setHand({ detected: true, x: 1 - wrist.x, y: wrist.y });
      } else {
        setHand(prev => ({ ...prev, detected: false }));
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

  return hand;
}
