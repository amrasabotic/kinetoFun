import { useEffect, useRef, useState, useCallback } from 'react';
import type { RoundConfig, ShotResult, ShotSnapshot } from '../types';
import { clamp } from '../utils/helpers';
import { initialShot, tickShot } from '../systems/shotEngine';
import { resolveShot } from '../systems/physics';
import { useGestureRef } from './useGesture';
import { sfx } from '../systems/audio';

const FLIGHT_DURATION_MS = 450;
const RESOLVED_HOLD_MS = 1100;
const AIM_SENSITIVITY = 2.4; // how far the reticle travels for a given hand movement

interface UseShotOptions {
  config: RoundConfig;
  nextWindSeed: () => number;
  onResolved: (outcome: { result: ShotResult; points: number }) => void;
}

/**
 * Drives the gesture shot state machine every animation frame. This is the
 * only place gesture input is allowed to mutate shot state — UI components
 * only read the resulting snapshot. Index finger aims; a held fist draws
 * power; opening the palm releases.
 */
export function useShot({ config, nextWindSeed, onResolved }: UseShotOptions) {
  const [shot, setShot] = useState<ShotSnapshot>(initialShot());
  const gestureRef = useGestureRef();
  const shotRef = useRef(shot);
  shotRef.current = shot;

  const drawSinceRef = useRef(0);
  const wasFistRef = useRef(false);
  const neutralSinceRef = useRef(0); // 0 = not currently in a neutral (non-fist, non-palm) streak
  const flightStartRef = useRef(0);
  const rafRef = useRef(0);
  const resetTimeoutRef = useRef<number | undefined>(undefined);

  const cancelShot = useCallback(() => {
    setShot(initialShot());
  }, []);

  useEffect(() => {
    function loop() {
      const now = performance.now();
      const gesture = gestureRef.current;
      const current = shotRef.current;

      const aim = {
        x: clamp((gesture.cursorX - 0.5) * 2 * AIM_SENSITIVITY, -1.6, 1.6),
        y: clamp((gesture.cursorY - 0.5) * 2 * AIM_SENSITIVITY, -1.6, 1.6),
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
          const outcome = resolveShot({
            aimX: current.aim.x,
            aimY: current.aim.y,
            power: current.power,
            config,
            windSeed: nextWindSeed,
          });
          sfx.release();
          flightStartRef.current = now;
          setShot({
            state: 'IN_FLIGHT',
            aim: current.aim,
            power: current.power,
            flightProgress: 0,
            impact: { x: outcome.impactX, y: outcome.impactY },
            result: outcome.result,
          });
          onResolved({ result: outcome.result, points: outcome.points });
        } else {
          const next = tickShot({
            snapshot: current,
            aim,
            isFist: gesture.isFist,
            drawHeldMs: now - drawSinceRef.current,
            neutralHeldMs,
            flightElapsedMs: 0,
            flightDurationMs: FLIGHT_DURATION_MS,
          });
          if (next !== current) setShot(next);
        }
      } else if (current.state === 'IN_FLIGHT') {
        const next = tickShot({
          snapshot: current,
          aim: current.aim,
          isFist: false,
          drawHeldMs: 0,
          neutralHeldMs: 0,
          flightElapsedMs: now - flightStartRef.current,
          flightDurationMs: FLIGHT_DURATION_MS,
        });
        if (next !== current) setShot(next);
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [config, gestureRef, nextWindSeed, onResolved]);

  useEffect(() => {
    if (shot.state !== 'RESOLVED') return;
    window.clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = window.setTimeout(() => {
      setShot(initialShot());
      wasFistRef.current = false;
      neutralSinceRef.current = 0;
    }, RESOLVED_HOLD_MS);
    return () => window.clearTimeout(resetTimeoutRef.current);
  }, [shot.state]);

  return { shot, cancelShot };
}
