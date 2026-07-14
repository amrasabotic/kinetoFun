import { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface HandData {
  palmX: number;   // 0-1 (image space)
  palmY: number;
  wristX: number;
  wristY: number;
  wristAngle: number;    // radians, paddle tilt from wrist-to-palm vector
  velocityX: number;     // world-space velocity (delta per frame, smoothed)
  velocityY: number;
  isFist: boolean;
  isPinch: boolean;
  isOpen: boolean;
  detected: boolean;
  landmarks: { x: number; y: number; z: number }[];
}

const EMPTY: HandData = {
  palmX: 0.5, palmY: 0.5, wristX: 0.5, wristY: 0.5,
  wristAngle: 0, velocityX: 0, velocityY: 0,
  isFist: false, isPinch: false, isOpen: false,
  detected: false, landmarks: [],
};

export function useMediaPipe(
  videoRef: React.RefObject<HTMLVideoElement>,
  smoothing = 0.7,
): React.MutableRefObject<HandData> {
  const handRef = useRef<HandData>({ ...EMPTY });
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const prevRef = useRef({ palmX: 0.5, palmY: 0.5, t: 0 });
  const smoothRef = useRef({ palmX: 0.5, palmY: 0.5, wristX: 0.5, wristY: 0.5, angle: 0 });

  useEffect(() => {
    let destroyed = false;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );
        const hl = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (destroyed) { hl.close(); return; }
        landmarkerRef.current = hl;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        if (destroyed) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current!;
        video.srcObject = stream;
        video.onloadedmetadata = () => { video.play(); loop(); };
      } catch (e) {
        console.warn('[MediaPipe] init failed', e);
      }
    }

    function loop() {
      if (destroyed || !landmarkerRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }

      try {
        const result: HandLandmarkerResult = landmarkerRef.current.detectForVideo(video, performance.now());
        if (result.landmarks.length > 0) {
          handRef.current = parseHand(result.landmarks[0], smoothing);
        } else {
          // Decay velocity and clear detection
          const s = smoothRef.current;
          handRef.current = {
            ...EMPTY,
            palmX: s.palmX, palmY: s.palmY,
            wristX: s.wristX, wristY: s.wristY,
            wristAngle: s.angle,
          };
        }
      } catch { /* ignore mid-destroy */ }

      rafRef.current = requestAnimationFrame(loop);
    }

    function parseHand(lm: { x: number; y: number; z: number }[], smooth: number): HandData {
      if (lm.length < 21) return { ...EMPTY };

      const wrist = lm[0];
      const palm  = lm[9];
      const thumb = lm[4];
      const index = lm[8];

      // Smoothing
      const s = smoothRef.current;
      s.palmX  = s.palmX  * smooth + palm.x  * (1 - smooth);
      s.palmY  = s.palmY  * smooth + palm.y  * (1 - smooth);
      s.wristX = s.wristX * smooth + wrist.x * (1 - smooth);
      s.wristY = s.wristY * smooth + wrist.y * (1 - smooth);

      // Wrist angle from wrist→palm vector (tilt of hand)
      const dx = palm.x - wrist.x;
      const dy = palm.y - wrist.y;
      const rawAngle = Math.atan2(dy, dx) - Math.atan2(1, 0); // relative to pointing down
      const angleDiff = ((rawAngle - s.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      s.angle += angleDiff * (1 - smooth * 0.5);

      // Velocity (per-frame delta)
      const now = performance.now();
      const dt = (now - prevRef.current.t) / 1000;
      const vx = dt > 0 ? (s.palmX - prevRef.current.palmX) / dt : 0;
      const vy = dt > 0 ? (s.palmY - prevRef.current.palmY) / dt : 0;
      prevRef.current = { palmX: s.palmX, palmY: s.palmY, t: now };

      // Finger curl
      const tips  = [4, 8, 12, 16, 20];
      const mcps  = [2, 5,  9, 13, 17];
      const curled = tips.map((tip, i) => lm[tip].y > lm[mcps[i]].y);
      const fistCount = curled.filter(Boolean).length;
      const pinchDist = Math.hypot(thumb.x - index.x, thumb.y - index.y);

      return {
        palmX: s.palmX,
        palmY: s.palmY,
        wristX: s.wristX,
        wristY: s.wristY,
        wristAngle: s.angle,
        velocityX: vx,
        velocityY: vy,
        isFist: fistCount >= 4,
        isPinch: pinchDist < 0.06,
        isOpen: fistCount <= 1,
        detected: true,
        landmarks: lm,
      };
    }

    init();
    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      const v = videoRef.current;
      if (v?.srcObject) (v.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, [smoothing]);

  return handRef;
}
