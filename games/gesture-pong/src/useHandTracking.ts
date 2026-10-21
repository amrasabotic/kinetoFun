import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface HandData {
  indexTipX: number; // 0-1 normalized
  indexTipY: number; // 0-1 normalized
  detected: boolean;
}

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement>) {
  const [handData, setHandData] = useState<HandData>({ indexTipX: 0.5, indexTipY: 0.5, detected: false });
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const landmarker = handLandmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const results = landmarker.detectForVideo(video, performance.now());
      if (results.landmarks && results.landmarks.length > 0) {
        const lm = results.landmarks[0];
        // Index fingertip is landmark 8
        const tip = lm[8];
        // Mirror X because video is mirrored
        setHandData({ indexTipX: 1 - tip.x, indexTipY: tip.y, detected: true });
      } else {
        setHandData(prev => ({ ...prev, detected: false }));
      }
    }
    animFrameRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        '/mediapipe/tasks-vision-0.10.35/wasm'
      );
      if (cancelled) return;
      const lm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            '/mediapipe/models/hand_landmarker-float16-v1.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      if (cancelled) return;
      handLandmarkerRef.current = lm;

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (cancelled) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play();
      }
      animFrameRef.current = requestAnimationFrame(detect);
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      const video = videoRef.current;
      if (video && video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      handLandmarkerRef.current?.close();
    };
  }, [detect, videoRef]);

  return handData;
}
