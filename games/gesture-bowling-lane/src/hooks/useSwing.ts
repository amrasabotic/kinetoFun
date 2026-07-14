import { useEffect, useRef, useState, useCallback } from 'react';
import type { DifficultyConfig, RollOutcome, SwingSnapshot } from '../types';
import { clamp, lerp } from '../utils/helpers';
import {
  initialSwing,
  tickSwing,
  swingPower,
  BACK_LINE,
  RELEASE_LINE,
  REVERSAL_MARGIN,
} from '../systems/swingEngine';
import { resolveRoll } from '../systems/pinEngine';
import { useGestureRef } from './useGesture';
import { sfx } from '../systems/audio';

const LANE_SENSITIVITY = 1.6;
const RESOLVED_HOLD_MS = 1400;

interface UseSwingOptions {
  config: DifficultyConfig;
  standingPinIds: number[];
  laneBias: number; // subtle constant curve offset shared by everyone in Daily mode
  onResolved: (outcome: RollOutcome) => void;
}

/**
 * Drives the gesture swing state machine every animation frame. This is the
 * only place gesture input is allowed to mutate swing state — UI components
 * only read the resulting snapshot. The hand's live position sets the lane
 * aim; raising it starts the windup; swinging it back down through the
 * release line lets the ball go, with power from swing speed and curve from
 * sideways drift during the forward swing.
 */
export function useSwing({ config, standingPinIds, laneBias, onResolved }: UseSwingOptions) {
  const [swing, setSwing] = useState<SwingSnapshot>(initialSwing());
  const gestureRef = useGestureRef();
  const swingRef = useRef(swing);
  swingRef.current = swing;

  const prevYRef = useRef<number | null>(null);
  const minYSinceBackswingRef = useRef(1);
  const forwardStartXRef = useRef(0.5);
  const forwardStartTimeRef = useRef(0);
  const rollStartTimeRef = useRef(0);
  const rafRef = useRef(0);
  const resetTimeoutRef = useRef<number | undefined>(undefined);

  const resetSwing = useCallback(() => {
    setSwing(initialSwing());
    prevYRef.current = null;
  }, []);

  useEffect(() => {
    function loop() {
      const now = performance.now();
      const gesture = gestureRef.current;
      const current = swingRef.current;
      const currentY = gesture.cursorY;
      const prevY = prevYRef.current ?? currentY;
      const lanePositionLive = clamp((gesture.cursorX - 0.5) * 2 * LANE_SENSITIVITY, -1.5, 1.5);

      if (current.state === 'READY' || current.state === 'BACKSWING' || current.state === 'FORWARD_SWING') {
        const crossedBackLine = current.state === 'READY' && prevY >= BACK_LINE && currentY < BACK_LINE;

        if (current.state === 'BACKSWING') {
          minYSinceBackswingRef.current = Math.min(minYSinceBackswingRef.current, currentY);
        }
        const crossedReversal =
          current.state === 'BACKSWING' && currentY > minYSinceBackswingRef.current + REVERSAL_MARGIN;

        if (current.state === 'FORWARD_SWING' && prevY < RELEASE_LINE && currentY >= RELEASE_LINE) {
          const durationMs = now - forwardStartTimeRef.current;
          const power = swingPower(durationMs);
          const curve = clamp(gesture.cursorX - forwardStartXRef.current, -1, 1);
          const outcome = resolveRoll({
            lanePosition: current.lanePosition,
            power,
            curve: curve + laneBias,
            config,
            standingPinIds,
          });
          sfx.release();
          rollStartTimeRef.current = now;
          setSwing({
            ...current,
            state: 'ROLLING',
            power,
            curve,
            rollProgress: 0,
            ballLateral: current.lanePosition,
            outcome,
          });
        } else {
          const next = tickSwing({
            snapshot: current,
            lanePositionLive,
            crossedBackLine,
            crossedReversal,
            rollElapsedMs: 0,
          });
          if (next.state === 'BACKSWING' && current.state === 'READY') {
            minYSinceBackswingRef.current = currentY;
            sfx.swingWhoosh();
          }
          if (next.state === 'FORWARD_SWING' && current.state === 'BACKSWING') {
            forwardStartTimeRef.current = now;
            forwardStartXRef.current = gesture.cursorX;
          }
          if (next !== current) setSwing(next);
        }
      } else if (current.state === 'ROLLING') {
        const next = tickSwing({
          snapshot: current,
          lanePositionLive: current.lanePosition,
          crossedBackLine: false,
          crossedReversal: false,
          rollElapsedMs: now - rollStartTimeRef.current,
        });
        if (next !== current) {
          const ballLateral = current.outcome
            ? lerp(current.lanePosition, current.outcome.finalLateral, next.rollProgress)
            : current.lanePosition;
          setSwing({ ...next, ballLateral });
        }
      }

      prevYRef.current = currentY;
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [config, standingPinIds, laneBias, gestureRef]);

  useEffect(() => {
    if (swing.state !== 'RESOLVED' || !swing.outcome) return;
    onResolved(swing.outcome);
    window.clearTimeout(resetTimeoutRef.current);
    resetTimeoutRef.current = window.setTimeout(() => {
      resetSwing();
    }, RESOLVED_HOLD_MS);
    return () => window.clearTimeout(resetTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swing.state]);

  return { swing, resetSwing };
}
