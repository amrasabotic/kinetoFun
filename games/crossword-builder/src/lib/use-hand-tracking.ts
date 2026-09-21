import { useEffect, useRef, useState } from "react";

export interface HandLandmark { x: number; y: number; z?: number }

export interface HandState {
  x: number; // normalized 0..1 across viewport width (mirrored)
  y: number; // normalized 0..1 across viewport height
  pinching: boolean;
  active: boolean;
  error: string | null;
  stream: MediaStream | null;
  landmarks: HandLandmark[] | null; // raw (unmirrored) landmarks from MediaPipe
}

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export function useHandTracking(enabled: boolean) {
  const [state, setState] = useState<HandState>({
    x: 0.5, y: 0.5, pinching: false, active: false, error: null, stream: null, landmarks: null,
  });
  const cleanupRef = useRef<(() => void) | null>(null);
  const smoothRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let stopped = false;
    let rafId = 0;
    let landmarker: any = null;
    let stream: MediaStream | null = null;
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(video);

    (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          numHands: 1,
          runningMode: "VIDEO",
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        video.srcObject = stream;
        await new Promise<void>((r) => {
          video.onloadedmetadata = () => { video.play().then(() => r()); };
        });
        if (stopped) return;
        setState((s) => ({ ...s, active: true, error: null, stream }));

        let lastT = 0;
        let pinchHold = false;
        const loop = () => {
          if (stopped) return;
          rafId = requestAnimationFrame(loop);
          const t = performance.now();
          if (t - lastT < 33) return;
          lastT = t;
          try {
            const res = landmarker.detectForVideo(video, t);
            const lms = res?.landmarks?.[0] ?? null;
            if (lms) {
              const idx = lms[8];
              const thumb = lms[4];
              const rawX = 1 - idx.x;
              const rawY = idx.y;
              const dx = idx.x - thumb.x;
              const dy = idx.y - thumb.y;
              const dz = (idx.z ?? 0) - (thumb.z ?? 0);
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              const threshOn = 0.055;
              const threshOff = 0.085;
              if (!pinchHold && dist < threshOn) pinchHold = true;
              else if (pinchHold && dist > threshOff) pinchHold = false;
              const a = 0.35;
              smoothRef.current.x = smoothRef.current.x * (1 - a) + rawX * a;
              smoothRef.current.y = smoothRef.current.y * (1 - a) + rawY * a;
              setState((s) => ({
                ...s,
                x: smoothRef.current.x,
                y: smoothRef.current.y,
                pinching: pinchHold,
                landmarks: lms,
              }));
            } else {
              setState((s) => (s.landmarks ? { ...s, landmarks: null } : s));
            }
          } catch (e) { /* ignore */ }
        };
        loop();
      } catch (err: any) {
        if (!stopped) setState((s) => ({ ...s, error: err?.message || "Camera unavailable", active: false }));
      }
    })();

    cleanupRef.current = () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      try { landmarker?.close?.(); } catch {}
      video.remove();
    };

    return () => { cleanupRef.current?.(); cleanupRef.current = null; };
  }, [enabled]);

  return state;
}

// MediaPipe hand connections (pairs of landmark indices)
export const HAND_CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];
