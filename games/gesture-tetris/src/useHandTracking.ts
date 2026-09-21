import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface HandsRaw {
  hands:         NormalizedLandmark[][];  // raw un-mirrored landmarks per hand
  leftDetected:  boolean;
  rightDetected: boolean;
}

const EMPTY: HandsRaw = { hands: [], leftDetected: false, rightDetected: false };

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement>): HandsRaw {
  const [handsRaw, setHandsRaw]   = useState<HandsRaw>(EMPTY);
  const landmarkerRef              = useRef<HandLandmarker | null>(null);
  const animFrameRef               = useRef<number>(0);
  const lastVideoTime              = useRef<number>(-1);

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

      const hands: NormalizedLandmark[][] = [];
      let leftDetected  = false;
      let rightDetected = false;

      if (results.landmarks?.length > 0) {
        results.landmarks.forEach((landmarks, i) => {
          const handedness = (results.handednesses[i]?.[0]?.categoryName ?? 'Right') as 'Left' | 'Right';
          if (handedness === 'Left')  leftDetected  = true;
          else                        rightDetected = true;
          hands.push(landmarks);
        });
      }

      setHandsRaw({ hands, leftDetected, rightDetected });
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
        numHands:    1,
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

  return handsRaw;
}
