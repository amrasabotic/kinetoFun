import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// MediaPipe landmark indices for fingertips
const FINGERTIP_INDICES = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky

export interface FingertipData {
  x: number; // 0–1, mirrored (so left side of camera = low x)
  y: number; // 0–1 normalized
}

export interface HandsData {
  fingertips:    FingertipData[]; // all detected fingertips (up to 10)
  leftDetected:  boolean;
  rightDetected: boolean;
}

const EMPTY: HandsData = { fingertips: [], leftDetected: false, rightDetected: false };

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement>): HandsData {
  const [handsData, setHandsData] = useState<HandsData>(EMPTY);
  const landmarkerRef  = useRef<HandLandmarker | null>(null);
  const animFrameRef   = useRef<number>(0);
  const lastVideoTime  = useRef<number>(-1);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const lm    = landmarkerRef.current;
    if (!video || !lm || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    if (video.currentTime !== lastVideoTime.current) {
      lastVideoTime.current = video.currentTime;
      const results = lm.detectForVideo(video, performance.now());

      const fingertips: FingertipData[] = [];
      let leftDetected  = false;
      let rightDetected = false;

      if (results.landmarks?.length > 0) {
        results.landmarks.forEach((landmarks, i) => {
          const handedness = (results.handednesses[i]?.[0]?.categoryName ?? 'Right') as 'Left' | 'Right';
          if (handedness === 'Left')  leftDetected  = true;
          else                        rightDetected = true;

          for (const idx of FINGERTIP_INDICES) {
            const pt = landmarks[idx];
            if (pt) {
              fingertips.push({ x: 1 - pt.x, y: pt.y }); // mirror X
            }
          }
        });
      }

      setHandsData({ fingertips, leftDetected, rightDetected });
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      if (cancelled) return;
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands:    2,
      });
      if (cancelled) return;
      landmarkerRef.current = landmarker;

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      const video = videoRef.current;
      if (video) { video.srcObject = stream; video.play(); }
      animFrameRef.current = requestAnimationFrame(detect);
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      const video = videoRef.current;
      if (video?.srcObject) (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      landmarkerRef.current?.close();
    };
  }, [detect, videoRef]);

  return handsData;
}
