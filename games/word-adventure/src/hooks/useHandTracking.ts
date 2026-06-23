import { useEffect, useRef, useState } from "react";

export interface HandState {
  x: number; // viewport px
  y: number; // viewport px
  pinching: boolean;
  visible: boolean;
}

declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

const MEDIAPIPE_HANDS = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
const MEDIAPIPE_CAMERA = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

let scriptsPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => res();
    s.onerror = () => rej(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function loadMediaPipe() {
  if (!scriptsPromise) {
    scriptsPromise = (async () => {
      await loadScript(MEDIAPIPE_HANDS);
      await loadScript(MEDIAPIPE_CAMERA);
    })();
  }
  return scriptsPromise;
}

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement | null>, enabled = true) {
  const [state, setState] = useState<HandState>({ x: 0, y: 0, pinching: false, visible: false });
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const pinchingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        await loadMediaPipe();
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;

        const hands = new window.Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });
        hands.onResults((results: any) => {
          if (cancelled) return;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          if (results.multiHandLandmarks?.length) {
            const lm = results.multiHandLandmarks[0];
            const index = lm[8];
            const thumb = lm[4];
            // Mirror horizontally so movement matches webcam mirror.
            const nx = 1 - index.x;
            const ny = index.y;
            const x = nx * vw;
            const y = ny * vh;
            const dx = (index.x - thumb.x);
            const dy = (index.y - thumb.y);
            const dist = Math.hypot(dx, dy);
            const pinching = dist < 0.06;
            pinchingRef.current = pinching;
            setState({ x, y, pinching, visible: true });
          } else {
            if (pinchingRef.current) pinchingRef.current = false;
            setState((s) => ({ ...s, visible: false, pinching: false }));
          }
        });
        handsRef.current = hands;

        const camera = new window.Camera(video, {
          onFrame: async () => {
            if (handsRef.current && video.readyState >= 2) {
              await handsRef.current.send({ image: video });
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.current = camera;
        await camera.start();
        setReady(true);
      } catch (e: any) {
        setError(e?.message ?? "Camera failed");
      }
    })();

    return () => {
      cancelled = true;
      try { cameraRef.current?.stop?.(); } catch {}
      try { handsRef.current?.close?.(); } catch {}
    };
  }, [enabled, videoRef]);

  return { state, error, ready };
}
