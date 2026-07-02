import { useEffect, useState } from 'react';
import type { HandData } from '../gestures/useMediaPipe';
import { useTrackingQuality, type TrackingQuality } from '../gestures/useTrackingQuality';
import { CALIBRATION_STABLE_MS } from '../constants/gameConfig';

export type CalibrationState = 'waiting-for-hand' | 'tracking' | 'ready';

interface UseCalibrationResult {
  state: CalibrationState;
  quality: TrackingQuality;
  progressPct: number;
  detected: boolean;
}

/** Orchestrates the calibration screen's state machine: wait for a hand, track until 2s stable, then fire onReady() once. */
export function useCalibration(
  handRef: React.RefObject<HandData>,
  onReady: () => void,
): UseCalibrationResult {
  const { quality, stableMs, detected } = useTrackingQuality(handRef);
  const [fired, setFired] = useState(false);

  useEffect(() => {
    if (!fired && stableMs >= CALIBRATION_STABLE_MS) {
      setFired(true);
      onReady();
    }
  }, [stableMs, fired, onReady]);

  const state: CalibrationState = fired ? 'ready' : detected ? 'tracking' : 'waiting-for-hand';
  const progressPct = Math.min(100, (stableMs / CALIBRATION_STABLE_MS) * 100);

  return { state, quality, progressPct, detected };
}
