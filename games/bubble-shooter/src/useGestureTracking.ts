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

const PINCH_THRESH   = 0.07;  // normalized thumb-to-index distance
const PINCH_COOLDOWN = 700;   // ms between shots

export function useGestureTracking(
  videoRef: React.RefObject<HTMLVideoElement>,
  onFrame: (data: GestureData) => void,
): void {
  const landmarkerRef  = useRef<HandLandmarker | null>(null);
  const rafRef         = useRef<number>(0);
  const lastTimeRef    = useRef<number>(-1);
  const pinchCoolRef   = useRef<number>(0);
  const wasPinchedRef  = useRef<boolean>(false);
  const lastTickRef    = useRef<number>(-1);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const lm    = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect);
      return;
    }
    const now = performance.now();

    // Drain cooldown with real elapsed time
    if (lastTickRef.current >= 0 && pinchCoolRef.current > 0) {
      pinchCoolRef.current -= now - lastTickRef.current;
    }
    lastTickRef.current = now;

    if (video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const results = lm.detectForVideo(video, now);

      if (results.landmarks?.length > 0) {
        const pts = results.landmarks[0] as Landmark[];
        const wrist     = pts[0];
        const indexMCP  = pts[5];
        const indexTip  = pts[8];
        const thumbTip  = pts[4];

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

        // Pinch detection: thumb tip close to index tip
        const pinchDist = Math.hypot(mx(thumbTip.x) - mx(indexTip.x), thumbTip.y - indexTip.y);
        const pinched   = pinchDist < PINCH_THRESH;

        let flick = false;
        if (pinched && !wasPinchedRef.current && pinchCoolRef.current <= 0) {
          flick = true;
          pinchCoolRef.current = PINCH_COOLDOWN;
        }
        wasPinchedRef.current = pinched;

        onFrame({ detected: true, wristX, wristY, aimAngle: angle, flick });
      } else {
        onFrame({ detected: false, wristX: 0.5, wristY: 0.5, aimAngle: Math.PI / 2, flick: false });
        wasPinchedRef.current = false;
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
