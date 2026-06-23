import { useEffect, useRef, useCallback } from 'react';
import type { HandState } from './types';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915';
const CAM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';

// Players rarely reach the outermost edges of the camera frame comfortably.
// These margins define what fraction of each edge to treat as "already 0 or 1".
// MX=0.18 means the inner 64% of camera width maps to 0–1 screen width.
const MX = 0.18;
const MY = 0.15;
function expand(v: number, margin: number) {
  return Math.max(0, Math.min(1, (v - margin) / (1 - margin * 2)));
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onHandUpdate: (state: HandState) => void,
  enabled: boolean = true
) {
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const onHandUpdateRef = useRef(onHandUpdate);
  onHandUpdateRef.current = onHandUpdate;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !videoRef.current) return;

    let active = true;

    async function init() {
      try {
        // Load hands first, then camera utils
        await loadScript(`${CDN_BASE}/hands.js`);
        await loadScript(CAM_CDN);

        if (!active || !videoRef.current) return;

        const Hands = window.Hands;
        const Camera = window.Camera;

        if (!Hands || !Camera) {
          console.warn('[HandTracking] MediaPipe not available on window');
          return;
        }

        const hands = new Hands({
          locateFile: (file: string) => `${CDN_BASE}/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.55,
        });

        hands.onResults((results: any) => {
          if (!active) return;

          if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            onHandUpdateRef.current({
              cursorX: -1,
              cursorY: -1,
              isPinching: false,
              isTracking: false,
            });
            return;
          }

          const lm = results.multiHandLandmarks[0];
          // Landmark indices: 4=thumb tip, 8=index tip, 12=middle tip
          const indexTip = lm[8];
          const middleTip = lm[12];

          // Mirror x-axis so cursor matches natural hand movement, then expand to full screen
          const cursorX = expand(1 - indexTip.x, MX);
          const cursorY = expand(indexTip.y, MY);

          // Two-finger gesture: index + middle finger tips close together
          const dx = indexTip.x - middleTip.x;
          const dy = indexTip.y - middleTip.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const isPinching = dist < 0.065;

          onHandUpdateRef.current({ cursorX, cursorY, isPinching, isTracking: true });
        });

        handsRef.current = hands;

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current && active) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        cameraRef.current = camera;
        await camera.start();
      } catch (err) {
        console.warn('[HandTracking] Initialization error:', err);
      }
    }

    init();

    return () => {
      active = false;
      if (cameraRef.current) {
        try { cameraRef.current.stop(); } catch (_) {}
        cameraRef.current = null;
      }
      if (handsRef.current) {
        try { handsRef.current.close(); } catch (_) {}
        handsRef.current = null;
      }
    };
  }, [enabled, videoRef]);
}
