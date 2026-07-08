import { useCallback, useEffect, useRef, useState } from 'react';
import type { DartOutcome, ThrowConfig, ThrowSnapshot } from '../types';
import { clamp } from '../utils/helpers';
import { initialThrow, tickThrow } from '../systems/throwEngine';
import { resolveThrow } from '../systems/physics';
import { useGestureRef } from './useGesture';
import { sfx } from '../systems/audio';

const FLIGHT_DURATION_MS = 350;
const RESOLVED_HOLD_MS = 1100;
const AIM_SENSITIVITY = 1.5; // the dartboard fills more of the frame than archery's distant target

interface UseThrowOptions {
  config: ThrowConfig;
  nextJitterSeed: () => number;
  onResolved: (outcome: DartOutcome) => void;
  /** Only the human player's hook should read gestures — false while it's the CPU's turn. */
  enabled: boolean;
}

/**
 * Drives the gesture throw state machine every animation frame, in the same
 * shape as this catalog's archery/mini-golf shot hooks: index finger aims,
 * a held fist draws back power, opening the palm releases the dart.
 */
export function useThrow({ config, nextJitterSeed, onResolved, enabled }: UseThrowOptions) {
  const [throwState, setThrowState] = useState<ThrowSnapshot>(initialThrow());
  const gestureRef = useGestureRef();
  const snapshotRef = useRef(throwState);
  snapshotRef.current = throwState;

  const drawSinceRef = useRef(0);
  const wasFistRef = useRef(false);
  const neutralSinceRef = useRef(0); // 0 = not currently in a neutral (non-fist, non-palm) streak
  const flightStartRef = useRef(0);
  const rafRef = useRef(0);
  const resetTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function loop() {
      if (!enabled) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      const gesture = gestureRef.current;
      const current = snapshotRef.current;

      const aim = {
        x: clamp((gesture.cursorX - 0.5) * 2 * AIM_SENSITIVITY, -1.4, 1.4),
        y: clamp((gesture.cursorY - 0.5) * 2 * AIM_SENSITIVITY, -1.4, 1.4),
      };

      if (current.state === 'AIMING' || current.state === 'DRAWING') {
        if (gesture.isFist && !wasFistRef.current) {
          drawSinceRef.current = now;
          sfx.drawCreak();
        }
        wasFistRef.current = gesture.isFist;

        const isNeutral = !gesture.isFist && !gesture.isOpenPalm;
        if (!isNeutral) {
          neutralSinceRef.current = 0;
        } else if (neutralSinceRef.current === 0) {
          neutralSinceRef.current = now;
        }
        const neutralHeldMs = isNeutral && neutralSinceRef.current ? now - neutralSinceRef.current : 0;

        if (current.state === 'DRAWING' && gesture.isOpenPalm) {
          const outcome = resolveThrow({
            aimX: current.aim.x,
            aimY: current.aim.y,
            power: current.power,
            config,
            jitterSeed: nextJitterSeed,
          });
          sfx.release();
          flightStartRef.current = now;
          setThrowState({
            state: 'IN_FLIGHT',
            aim: current.aim,
            power: current.power,
            flightProgress: 0,
            impact: { x: outcome.x, y: outcome.y },
            outcome,
          });
          onResolved(outcome);
        } else {
          const next = tickThrow({
            snapshot: current,
            aim,
            isFist: gesture.isFist,
            drawHeldMs: now - drawSinceRef.current,
            neutralHeldMs,
            flightElapsedMs: 0,
            flightDurationMs: FLIGHT_DURATION_MS,
          });
          if (next !== current) setThrowState(next);
        }
      } else if (current.state === 'IN_FLIGHT') {
        const next = tickThrow({
          snapshot: current,
          aim: current.aim,
          isFist: false,
          drawHeldMs: 0,
          neutralHeldMs: 0,
          flightElapsedMs: now - flightStartRef.current,
          flightDurationMs: FLIGHT_DURATION_MS,
        });
        if (next !== current) setThrowState(next);
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [config, enabled, gestureRef, nextJitterSeed, onResolved]);

  useEffect(() => {
    if (throwState.state !== 'RESOLVED') return;
    window.clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = window.setTimeout(() => {
      setThrowState(initialThrow());
      wasFistRef.current = false;
      neutralSinceRef.current = 0;
    }, RESOLVED_HOLD_MS);
    return () => window.clearTimeout(resetTimeoutRef.current);
  }, [throwState.state]);

  const resetThrow = useCallback(() => setThrowState(initialThrow()), []);

  return { throwState, resetThrow };
}
