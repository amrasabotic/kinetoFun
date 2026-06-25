import { useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface GestureData {
  detected: boolean;
  wristX: number;
  wristY: number;
  aimAngle: number;   // radians, 0 = right, π/2 = down; clamped to point upward
  flick: boolean;     // transient: true for exactly one frame when flick detected
}

interface Landmark { x: number; y: number; z: number; }

const FLICK_VY_THRESH = -0.022;  // upward wrist velocity (normalized/ms)
const FLICK_COOLDOWN  = 700;     // ms between flicks
const VY_WINDOW       = 60;      // ms window for velocity calc

export function useGestureTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  onFrame: (data: GestureData) => void,
): void {
  const landmarkerRef  = useRef<HandLandmarker | null>(null);
  const rafRef         = useRef<number>(0);
  const lastTimeRef    = useRef<number>(-1);
  const flickCoolRef   = useRef<number>(0);
  const wristYHistRef  = useRef<{ t: number; y: number }[]>([]);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const lm    = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    const now = performance.now();
    if (video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const results = lm.detectForVideo(video, now);

      if (results.landmarks?.length > 0) {
        const pts = results.landmarks[0] as Landmark[];
        const wrist     = pts[0];
        const indexMCP  = pts[5];
        const indexTip  = pts[8];

        // Mirror x for selfie view
        const mx  = (x: number) => 1 - x;
        const wristX = mx(wrist.x);
        const wristY = wrist.y;

        // Aim angle: from index MCP to index tip, mirrored
        const dx = mx(indexTip.x) - mx(indexMCP.x);
        const dy = indexMCP.y - indexTip.y; // positive = upward in screen space
        let angle = Math.atan2(dy, dx);

        // Clamp so the bubble always fires upward (between π/12 and 11π/12 from right)
        const MIN_ANGLE = Math.PI / 12;
        const MAX_ANGLE = (11 * Math.PI) / 12;
        if (angle < MIN_ANGLE) angle = MIN_ANGLE;
        if (angle > MAX_ANGLE) angle = MAX_ANGLE;

        // Wrist Y velocity
        const hist = wristYHistRef.current;
        hist.push({ t: now, y: wristY });
        while (hist.length > 0 && now - hist[0].t > VY_WINDOW) hist.shift();

        let flick = false;
        if (hist.length >= 2 && flickCoolRef.current <= 0) {
          const oldest = hist[0];
          const newest = hist[hist.length - 1];
          const dt = newest.t - oldest.t;
          if (dt > 0) {
            const vy = (newest.y - oldest.y) / dt;
            if (vy < FLICK_VY_THRESH) {
              flick = true;
              flickCoolRef.current = FLICK_COOLDOWN;
              wristYHistRef.current = [];
            }
          }
        }
        if (flickCoolRef.current > 0) {
          flickCoolRef.current -= 16; // approx frame time
        }

        onFrame({ detected: true, wristX, wristY, aimAngle: angle, flick });
      } else {
        onFrame({ detected: false, wristX: 0.5, wristY: 0.5, aimAngle: Math.PI / 2, flick: false });
        wristYHistRef.current = [];
      }
    }
    rafRef.current = requestAnimationFrame(detect);
  }, [videoRef, onFrame]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      if (cancelled) return;
      const hlm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      if (cancelled) return;
      landmarkerRef.current = hlm;
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
}

// Lightweight wrist tracker for menu screens
export interface MenuHandData { detected: boolean; x: number; y: number; }

export function useMenuHand(
  videoRef: React.RefObject<HTMLVideoElement>,
): [MenuHandData, React.MutableRefObject<MenuHandData>] {
  const handRef    = useRef<MenuHandData>({ detected: false, x: 0.5, y: 0.5 });
  const lmRef      = useRef<HandLandmarker | null>(null);
  const rafRef     = useRef<number>(0);
  const lastTRef   = useRef<number>(-1);

  useEffect(() => {
    let cancelled = false;
    let setHand: ((d: MenuHandData) => void) | null = null;
    // We expose state via ref only; caller reads handRef directly
    function detect() {
      const video = videoRef.current;
      const lm    = lmRef.current;
      if (!video || !lm || video.readyState < 2) { rafRef.current = requestAnimationFrame(detect); return; }
      if (video.currentTime !== lastTRef.current) {
        lastTRef.current = video.currentTime;
        const res = lm.detectForVideo(video, performance.now());
        if (res.landmarks?.length > 0) {
          const w = res.landmarks[0][0] as Landmark;
          const d = { detected: true, x: 1 - w.x, y: w.y };
          handRef.current = d;
          setHand?.(d);
        } else {
          handRef.current = { ...handRef.current, detected: false };
          setHand?.({ ...handRef.current, detected: false });
        }
      }
      rafRef.current = requestAnimationFrame(detect);
    }
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      if (cancelled) return;
      const hlm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      if (cancelled) return;
      lmRef.current = hlm;
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
      lmRef.current?.close();
    };
  }, [videoRef]);

  return [handRef.current, handRef];
}
