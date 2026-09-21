import { useCallback, useRef, useState } from 'react';
import { createHandTracker, HandTracker } from '../utils/handTracking';
import { HandPosition } from '../types/game';

export function useHandTracking() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const trackerRef = useRef<HandTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initPromiseRef = useRef<Promise<boolean> | null>(null);

  const initialize = useCallback(async (): Promise<boolean> => {
    // Already have a tracker
    if (trackerRef.current) return true;
    // Dedup concurrent calls
    if (initPromiseRef.current) return initPromiseRef.current;

    setIsStarting(true);
    setError(null);

    initPromiseRef.current = (async () => {
      try {
        const tracker = createHandTracker();
        const success = await tracker.initialize();
        if (success) {
          trackerRef.current = tracker;
          setIsInitialized(true);
          return true;
        }
        setError('Failed to initialize hand tracker');
        return false;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        return false;
      } finally {
        setIsStarting(false);
        initPromiseRef.current = null;
      }
    })();

    return initPromiseRef.current;
  }, []);

  const startCamera = useCallback(async (video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<boolean> => {
    if (!trackerRef.current) {
      console.error('Cannot start camera - tracker not initialized');
      return false;
    }

    try {
      // Acquire camera stream if we don't have one yet
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
        });
        streamRef.current = stream;
      }

      // Always attach the stream to the provided video element and wait for it to be ready
      video.srcObject = streamRef.current;
      await new Promise<void>((resolve, reject) => {
        if (video.readyState >= 2) { resolve(); return; }
        const onCanPlay = () => { video.removeEventListener('canplay', onCanPlay); video.removeEventListener('error', onError); resolve(); };
        const onError = (e: Event) => { video.removeEventListener('canplay', onCanPlay); video.removeEventListener('error', onError); reject(e); };
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('error', onError);
        video.play().catch(reject);
      });

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Always (re)start the tracking loop on the given video+canvas.
      // HandTracker.startTracking checks `this.running` and skips if already running,
      // so we stop first to guarantee a fresh loop on the new elements.
      trackerRef.current.stop();
      trackerRef.current.startTracking(video, canvas);

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access denied';
      console.error('Camera error:', msg);
      setError(msg);
      return false;
    }
  }, []);

  const getPosition = useCallback((): HandPosition => {
    return trackerRef.current?.getPosition() ?? { x: 0.5, y: 0.5, angle: 0, detected: false };
  }, []);

  const stop = useCallback(() => {
    trackerRef.current?.destroy();
    trackerRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    initPromiseRef.current = null;
    setIsInitialized(false);
  }, []);

  return { initialize, startCamera, getPosition, stop, isInitialized, isStarting, error };
}
