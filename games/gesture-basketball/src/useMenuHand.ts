import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface MenuHandData {
  detected: boolean;
  x: number; // 0–1 normalised, mirrored
  y: number; // 0–1 normalised
}

// Each menu screen mounts this hook; loading the model once avoids seconds without a cursor on every screen change.
// The camera loses a hand at its edges, so the middle of its view is stretched over the whole screen (Back sits in a corner).
const reach = (v: number, lo: number, hi: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

// On the platform the bridge supplies one cursor for every game, drawn by the platform itself.
type SharedCursor = { x: number; y: number; visible: boolean };
const kf = (typeof window !== 'undefined' ? window : {}) as { __kfCursor?: SharedCursor; __kfMenu?: (on: boolean) => void };
export const usesSharedCursor = !!kf.__kfCursor;

let sharedLandmarker: Promise<HandLandmarker> | null = null;

export function useMenuHand(videoRef: React.RefObject<HTMLVideoElement>): MenuHandData {
  const [hand, setHand]   = useState<MenuHandData>({ detected: false, x: 0.5, y: 0.5 });
  const landmarkerRef     = useRef<HandLandmarker | null>(null);
  const rafRef            = useRef<number>(0);
  const lastTimeRef       = useRef<number>(-1);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const lm    = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    if (video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const results       = lm.detectForVideo(video, performance.now());
      const shared = kf.__kfCursor;
      if (shared) {
        setHand(shared.visible ? { detected: true, x: shared.x, y: shared.y } : prev => ({ ...prev, detected: false }));
      } else if (results.landmarks?.length > 0) {
        const wrist = results.landmarks[0][0];
        setHand({ detected: true, x: reach(1 - wrist.x, 0.12, 0.88), y: reach(wrist.y, 0.2, 0.85) });
      } else {
        setHand(prev => ({ ...prev, detected: false }));
      }
    }
    rafRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      sharedLandmarker ??= FilesetResolver.forVisionTasks('/mediapipe/tasks-vision-0.10.35/wasm')
        .then((vision) => HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            '/mediapipe/models/hand_landmarker-float16-v1.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands:    1,
      }))
        .catch((err) => { sharedLandmarker = null; throw err; });
      const lm = await sharedLandmarker;
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
    };
  }, [detect, videoRef]);

  // Buttons are on screen while a menu is mounted, so the platform shows its cursor.
  useEffect(() => {
    kf.__kfMenu?.(true);
    return () => kf.__kfMenu?.(false);
  }, []);

  return hand;
}
