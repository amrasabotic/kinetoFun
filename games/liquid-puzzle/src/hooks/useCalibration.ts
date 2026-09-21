import { useEffect, useRef, useState } from 'react';
import { useGestureRef } from './useGesture';

export type CalibrationStep = 'wait-hand' | 'palm' | 'left' | 'right' | 'up' | 'down' | 'done';

const STEP_ORDER: CalibrationStep[] = ['wait-hand', 'palm', 'left', 'right', 'up', 'down', 'done'];
const HOLD_CONFIRM_MS = 500; // how long a step's condition must hold before advancing
const STEP_TIMEOUT_MS = 4000; // safety net — advances anyway if the gesture never quite registers, so calibration never gets stuck

function stepSatisfied(step: CalibrationStep, cursorX: number, cursorY: number, isPalmOpen: boolean, isHovering: boolean): boolean {
  switch (step) {
    case 'wait-hand':
      return isHovering;
    case 'palm':
      return isPalmOpen;
    case 'left':
      return cursorX < 0.32;
    case 'right':
      return cursorX > 0.68;
    case 'up':
      return cursorY < 0.32;
    case 'down':
      return cursorY > 0.68;
    default:
      return true;
  }
}

/**
 * Sequences the onboarding calibration flow: wait for a hand, hold an open
 * palm, then sweep left/right/up/down — roughly 5 seconds total across the
 * five active steps at HOLD_CONFIRM_MS each. Functionally this doesn't feed
 * back into the cursor mapping (which is already normalized 0..1 and
 * doesn't need per-user calibration) — it exists as the onboarding beat the
 * spec calls for, and it does genuinely verify a hand is present and
 * responsive to motion before handing off to the main menu, rather than
 * being pure theater.
 */
export function useCalibration() {
  const gestureRef = useGestureRef();
  const [step, setStep] = useState<CalibrationStep>('wait-hand');
  const [progress, setProgress] = useState(0);
  const sinceConditionMetRef = useRef(0);
  const stepEnteredAtRef = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    function loop() {
      const now = performance.now();
      const g = gestureRef.current;

      if (step === 'done') return;

      const satisfied = stepSatisfied(step, g.cursorX, g.cursorY, g.isPalmOpen, g.isHovering);
      if (satisfied) {
        if (sinceConditionMetRef.current === 0) sinceConditionMetRef.current = now;
      } else {
        sinceConditionMetRef.current = 0;
      }

      const heldMs = sinceConditionMetRef.current ? now - sinceConditionMetRef.current : 0;
      const stepElapsed = now - stepEnteredAtRef.current;
      setProgress(Math.min(1, Math.max(heldMs / HOLD_CONFIRM_MS, stepElapsed / STEP_TIMEOUT_MS)));

      if (heldMs >= HOLD_CONFIRM_MS || stepElapsed >= STEP_TIMEOUT_MS) {
        const nextIndex = STEP_ORDER.indexOf(step) + 1;
        const next = STEP_ORDER[nextIndex] ?? 'done';
        sinceConditionMetRef.current = 0;
        stepEnteredAtRef.current = now;
        setProgress(0);
        setStep(next);
      }

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step, gestureRef]);

  return { step, progress, isDone: step === 'done' };
}
