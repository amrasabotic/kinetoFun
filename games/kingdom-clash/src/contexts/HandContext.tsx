import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const PINCH_ENTER = 0.20;
const PINCH_EXIT  = 0.28;

export interface HandCtxValue {
  cursor: { x: number; y: number } | null;
  isPinching: boolean;
  handDetected: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  error: string | null;
  /** Game screen calls this to register its pinch callbacks. Pass nulls to clear. */
  setCallbacks: (
    onStart: ((x: number, y: number) => void) | null,
    onEnd:   ((x: number, y: number) => void) | null
  ) => void;
}

const HandContext = createContext<HandCtxValue | null>(null);

export function HandProvider({ children }: { children: React.ReactNode }) {
  const videoRef  = useRef<HTMLVideoElement | null>(null);
  const lmRef     = useRef<HandLandmarker | null>(null);
  const animRef   = useRef<number>(0);
  const pinchRef  = useRef(false);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);

  // mutable callbacks — updated without re-mounting the camera
  const onStartRef = useRef<((x: number, y: number) => void) | null>(null);
  const onEndRef   = useRef<((x: number, y: number) => void) | null>(null);

  const [cursor,      setCursor]      = useState<{ x: number; y: number } | null>(null);
  const [isPinching,  setIsPinching]  = useState(false);
  const [handDetected,setHandDetected]= useState(false);
  const [isReady,     setIsReady]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const setCallbacks = (
    onStart: ((x: number, y: number) => void) | null,
    onEnd:   ((x: number, y: number) => void) | null
  ) => {
    onStartRef.current = onStart;
    onEndRef.current   = onEnd;
  };

  useEffect(() => {
    let mounted = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const lm = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (!mounted) return;
        lmRef.current = lm;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        await new Promise<void>(resolve => {
          video.onloadeddata = () => resolve();
          setTimeout(resolve, 5000);
        });
        await video.play().catch(() => {});
        videoRef.current = video;
        if (mounted) setIsReady(true);
      } catch (e: unknown) {
        if (mounted) setError((e as Error)?.message ?? 'Camera / MediaPipe failed');
      }
    }

    init();
    return () => {
      mounted = false;
      stream?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animRef.current);
      lmRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    let lastTs = 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    function loop(ts: number) {
      animRef.current = requestAnimationFrame(loop);
      const video = videoRef.current;
      const lm    = lmRef.current;
      if (!video || !lm || video.readyState < 2 || video.paused) return;
      if (ts - lastTs < 33) return;
      lastTs = ts;

      let results;
      try { results = lm.detectForVideo(video, ts); } catch { return; }

      const landmarks = results?.landmarks?.[0];
      if (!landmarks || landmarks.length === 0) {
        if (pinchRef.current && cursorRef.current) {
          pinchRef.current = false;
          setIsPinching(false);
          onEndRef.current?.(cursorRef.current.x, cursorRef.current.y);
        }
        setHandDetected(false);
        setCursor(null);
        cursorRef.current = null;
        return;
      }

      setHandDetected(true);
      const idx  = landmarks[8];
      const thu  = landmarks[4];
      const wrist    = landmarks[0];
      const indexMCP = landmarks[5];

      const cx = (1 - idx.x) * vw;
      const cy = idx.y * vh;
      setCursor({ x: cx, y: cy });
      cursorRef.current = { x: cx, y: cy };

      const handSize      = Math.hypot(wrist.x - indexMCP.x, wrist.y - indexMCP.y) || 0.1;
      const pinchDist     = Math.hypot(idx.x - thu.x, idx.y - thu.y);
      const normPinch     = pinchDist / handSize;
      const wasPinching   = pinchRef.current;
      const nowPinching   = wasPinching ? normPinch < PINCH_EXIT : normPinch < PINCH_ENTER;

      if (nowPinching !== wasPinching) {
        pinchRef.current = nowPinching;
        setIsPinching(nowPinching);
        if (nowPinching) onStartRef.current?.(cx, cy);
        else             onEndRef.current?.(cx, cy);
      }
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isReady]);

  return (
    <HandContext.Provider value={{ cursor, isPinching, handDetected, videoRef, isReady, error, setCallbacks }}>
      {children}
    </HandContext.Provider>
  );
}

export function useHand() {
  const ctx = useContext(HandContext);
  if (!ctx) throw new Error('useHand must be used within HandProvider');
  return ctx;
}
