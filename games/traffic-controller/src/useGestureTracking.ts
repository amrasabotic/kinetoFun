import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type Gesture = 'none' | 'point-left' | 'point-right' | 'wave' | 'stop';

export interface GestureData {
  detected: boolean;
  gesture: Gesture;
  x: number;   // mirrored wrist x (0–1)
  y: number;   // wrist y (0–1)
}

interface Landmark { x: number; y: number; z: number }

// Wave: >=3 direction reversals in a 20-sample x-position window
function detectWave(xHistory: number[]): boolean {
  if (xHistory.length < 10) return false;
  const mn = Math.min(...xHistory);
  const mx = Math.max(...xHistory);
  if (mx - mn < 0.09) return false;
  let changes = 0;
  let prev = 0;
  for (let i = 1; i < xHistory.length; i++) {
    const d = xHistory[i] - xHistory[i - 1];
    if (Math.abs(d) > 0.007) {
      if (prev > 0 && d < 0) changes++;
      if (prev < 0 && d > 0) changes++;
      prev = d;
    }
  }
  return changes >= 3;
}

function classifyGesture(lm: Landmark[], xHistory: number[]): Gesture {
  // Landmarks used:
  // 0=wrist, 5=idx-MCP, 6=idx-PIP, 8=idx-tip
  // 9=mid-MCP, 10=mid-PIP, 12=mid-tip
  // 13=ring-MCP, 14=ring-PIP, 16=ring-tip
  // 17=pinky-MCP, 18=pinky-PIP, 20=pinky-tip

  const indexExt  = lm[8].y  < lm[6].y  - 0.01;
  const middleExt = lm[12].y < lm[10].y - 0.01;
  const ringExt   = lm[16].y < lm[14].y - 0.01;
  const pinkyExt  = lm[20].y < lm[18].y - 0.01;

  // Wave overrides everything (checked first — rapid oscillation)
  if (detectWave(xHistory)) return 'wave';

  // Open palm: all 4 fingers extended AND hand spread wide
  if (indexExt && middleExt && ringExt && pinkyExt) {
    if (Math.abs(lm[8].x - lm[20].x) > 0.12) return 'stop';
  }

  // Pointing: only index extended, others curled, horizontal offset > threshold
  if (indexExt && !middleExt && !ringExt && !pinkyExt) {
    // mirrorDx > 0: index tip to the right of wrist in selfie view
    const mirrorDx = lm[0].x - lm[8].x;
    const verticalOffset = Math.abs(lm[8].y - lm[0].y);
    if (verticalOffset < 0.20) {
      if (mirrorDx >  0.10) return 'point-right';
      if (mirrorDx < -0.10) return 'point-left';
    }
  }

  return 'none';
}

export function useGestureTracking(videoRef: React.RefObject<HTMLVideoElement>): GestureData {
  const [data, setData] = useState<GestureData>({ detected: false, gesture: 'none', x: 0.5, y: 0.5 });
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef        = useRef<number>(0);
  const lastTimeRef   = useRef<number>(-1);
  const xHistoryRef   = useRef<number[]>([]);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const lm    = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect); return;
    }
    if (video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const results = lm.detectForVideo(video, performance.now());
      if (results.landmarks?.length > 0) {
        const landmarks = results.landmarks[0] as Landmark[];
        const mirroredX = 1 - landmarks[0].x;

        // Maintain 20-sample x history for wave detection
        xHistoryRef.current.push(mirroredX);
        if (xHistoryRef.current.length > 20) xHistoryRef.current.shift();

        const gesture = classifyGesture(landmarks, xHistoryRef.current);
        setData({ detected: true, gesture, x: mirroredX, y: landmarks[0].y });
      } else {
        xHistoryRef.current = [];
        setData(prev => ({ ...prev, detected: false, gesture: 'none' }));
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
      const lmr = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      if (cancelled) return;
      landmarkerRef.current = lmr;
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
