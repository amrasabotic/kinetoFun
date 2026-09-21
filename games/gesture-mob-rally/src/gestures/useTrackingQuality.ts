import { useEffect, useRef, useState } from 'react';
import type { HandData } from './useMediaPipe';

export type TrackingQuality = 'excellent' | 'good' | 'poor' | 'none';

interface TrackingQualityState {
  quality: TrackingQuality;
  stableMs: number;
  detected: boolean;
}

const SAMPLE_INTERVAL_MS = 100;
const WINDOW_SIZE = 10; // 1s rolling window at 100ms sampling

/**
 * Derives a human-readable tracking quality (Excellent/Good/Poor) from a
 * rolling window of recent HandData samples — decoupled from useMediaPipe so
 * it can be reused by any screen (calibration, settings, in-game HUD pill)
 * without knowing anything about MediaPipe internals.
 */
export function useTrackingQuality(handRef: React.RefObject<HandData>): TrackingQualityState {
  const [state, setState] = useState<TrackingQualityState>({ quality: 'none', stableMs: 0, detected: false });
  const samplesRef = useRef<{ detected: boolean; x: number; y: number }[]>([]);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const stableStartRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const hand = handRef.current;
      const detected = !!hand?.detected;
      const x = hand?.palmX ?? 0.5;
      const y = hand?.palmY ?? 0.5;

      const samples = samplesRef.current;
      samples.push({ detected, x, y });
      if (samples.length > WINDOW_SIZE) samples.shift();

      const detectionRate = samples.filter(s => s.detected).length / samples.length;

      let jitter = 0;
      if (lastPosRef.current && detected) {
        jitter = Math.hypot(x - lastPosRef.current.x, y - lastPosRef.current.y);
      }
      if (detected) lastPosRef.current = { x, y };

      let quality: TrackingQuality = 'none';
      if (detectionRate > 0.95 && jitter < 0.02) quality = 'excellent';
      else if (detectionRate > 0.8 && jitter < 0.05) quality = 'good';
      else if (detectionRate > 0.15) quality = 'poor';

      const now = performance.now();
      if (quality === 'excellent' || quality === 'good') {
        if (stableStartRef.current === null) stableStartRef.current = now;
      } else {
        stableStartRef.current = null;
      }
      const stableMs = stableStartRef.current ? now - stableStartRef.current : 0;

      setState({ quality, stableMs, detected });
    }, SAMPLE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [handRef]);

  return state;
}
