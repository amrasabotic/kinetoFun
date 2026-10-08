import { useEffect, useState } from "react";

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

/*
 * One camera and one hand tracker for the whole app. The menus and the puzzle
 * both read from it, because the game is played on TVs where every screen
 * must respond to the hand, and two trackers would fight over the webcam.
 */
const HIDDEN: HandState = { x: 0, y: 0, pinching: false, visible: false };
let current: HandState = HIDDEN;
let stream: MediaStream | null = null;
let startPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: HandState) {
  current = next;
  listeners.forEach((l) => l());
}

function startTracking(): Promise<void> {
  if (!startPromise) {
    startPromise = (async () => {
      await loadScript(MEDIAPIPE_HANDS);
      await loadScript(MEDIAPIPE_CAMERA);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;

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
        if (!results.multiHandLandmarks?.length) {
          if (current.visible) publish({ ...current, visible: false, pinching: false });
          return;
        }
        const lm = results.multiHandLandmarks[0];
        const index = lm[8];
        const thumb = lm[4];
        // Mirror horizontally so movement matches webcam mirror.
        const x = (1 - index.x) * window.innerWidth;
        const y = index.y * window.innerHeight;
        const pinching = Math.hypot(index.x - thumb.x, index.y - thumb.y) < 0.06;
        publish({ x, y, pinching, visible: true });
      });

      const camera = new window.Camera(video, {
        onFrame: async () => {
          if (video.readyState >= 2) await hands.send({ image: video });
        },
        width: 640,
        height: 480,
      });
      await camera.start();
      stream = video.srcObject as MediaStream | null;
      listeners.forEach((l) => l());
    })();
    // Let a later screen retry if the camera was refused or failed to load.
    startPromise.catch(() => {
      startPromise = null;
    });
  }
  return startPromise;
}

/**
 * The shared hand state. `videoRef`, when given, shows the camera feed.
 * While `enabled` is false the hand reads as not visible.
 */
export function useHandTracking(
  videoRef?: React.RefObject<HTMLVideoElement | null>,
  enabled = true,
) {
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    listeners.add(onChange);
    startTracking().catch((e: any) => setError(e?.message ?? "Camera failed"));
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    const v = videoRef?.current;
    if (v && stream && v.srcObject !== stream) {
      v.srcObject = stream;
      v.play().catch(() => {});
    }
  });

  return { state: enabled ? current : HIDDEN, error, ready: stream !== null };
}
