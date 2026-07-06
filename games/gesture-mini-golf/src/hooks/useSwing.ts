import { useEffect, useRef, useState, useCallback } from 'react';
import type { HoleDef, StrokeOutcome, SwingSnapshot } from '../types';
import { clamp } from '../utils/helpers';
import { initialSwing, tickSwing } from '../systems/swingEngine';
import { stepBall, MAX_PUTT_SPEED, type BallState } from '../systems/ballPhysics';
import { useGestureRef } from './useGesture';
import { sfx } from '../systems/audio';

const RESOLVED_HOLD_MS = 1200;
const MAX_DT_SECONDS = 0.05; // clamp physics steps so a stalled tab doesn't cause a huge jump

interface UseSwingOptions {
  hole: HoleDef;
  ballStart: { x: number; y: number };
  frictionScale: number;
  maxPuttSpeedMultiplier: number;
  onResolved: (outcome: StrokeOutcome) => void;
}

/**
 * Drives the gesture swing state machine every animation frame. This is the
 * only place gesture input is allowed to mutate swing state — UI components
 * only read the resulting snapshot. The index finger aims; a held fist
 * charges putt power; releasing the fist (opening the hand back up) shoots
 * the ball. While ROLLING, this hook steps systems/ballPhysics.ts every
 * frame until the ball stops, is holed, or lands in water.
 */
export function useSwing({ hole, ballStart, frictionScale, maxPuttSpeedMultiplier, onResolved }: UseSwingOptions) {
  const [swing, setSwing] = useState<SwingSnapshot>(() => initialSwing(ballStart.x, ballStart.y));
  const gestureRef = useGestureRef();
  const swingRef = useRef(swing);
  swingRef.current = swing;
  const ballStartRef = useRef(ballStart);
  ballStartRef.current = ballStart;
  const holeRef = useRef(hole);
  holeRef.current = hole;

  const chargeSinceRef = useRef(0);
  const wasFistRef = useRef(false);
  const ballStateRef = useRef<BallState>({ x: ballStart.x, y: ballStart.y, vx: 0, vy: 0 });
  const lastTickRef = useRef(0);
  const rafRef = useRef(0);
  const resetTimeoutRef = useRef<number | undefined>(undefined);

  const resetSwing = useCallback((overridePosition?: { x: number; y: number }) => {
    const start = overridePosition ?? ballStartRef.current;
    ballStateRef.current = { x: start.x, y: start.y, vx: 0, vy: 0 };
    setSwing(initialSwing(start.x, start.y));
    wasFistRef.current = false;
  }, []);

  useEffect(() => {
    function loop() {
      const now = performance.now();
      const gesture = gestureRef.current;
      const current = swingRef.current;
      const aimTargetLive = { x: clamp(gesture.cursorX, 0, 1), y: clamp(gesture.cursorY, 0, 1) };

      if (current.state === 'READY' || current.state === 'CHARGING') {
        if (gesture.isFist && !wasFistRef.current) {
          chargeSinceRef.current = now;
          sfx.swingWhoosh();
        }

        // Releasing the fist while charging is the sole shoot trigger — any
        // fist-to-not-fist transition fires it, regardless of what the hand
        // becomes afterward, so there's no neutral-gap race to fall into.
        if (current.state === 'CHARGING' && wasFistRef.current && !gesture.isFist) {
          const speed = current.power * MAX_PUTT_SPEED * maxPuttSpeedMultiplier;
          const angle = Math.atan2(
            current.aimTarget.y - current.ballPosition.y,
            current.aimTarget.x - current.ballPosition.x,
          );
          ballStateRef.current = {
            x: current.ballPosition.x,
            y: current.ballPosition.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          };
          lastTickRef.current = now;
          wasFistRef.current = gesture.isFist;
          sfx.putt();
          setSwing({ ...current, state: 'ROLLING' });
        } else {
          const next = tickSwing({
            snapshot: current,
            aimTargetLive,
            isFist: gesture.isFist,
            chargeHeldMs: now - chargeSinceRef.current,
          });
          wasFistRef.current = gesture.isFist;
          if (next !== current) setSwing(next);
        }
      } else if (current.state === 'ROLLING') {
        const dt = Math.min(MAX_DT_SECONDS, (now - lastTickRef.current) / 1000);
        lastTickRef.current = now;
        const result = stepBall(ballStateRef.current, holeRef.current, dt, frictionScale);
        ballStateRef.current = result.ball;

        if (result.stopped) {
          const kind = result.holed ? 'holed' : result.inWater ? 'water' : 'rest';
          if (kind === 'holed') sfx.holed();
          else if (kind === 'water') sfx.splash();
          const restPosition =
            kind === 'water' ? { x: holeRef.current.tee.x, y: holeRef.current.tee.y } : { x: result.ball.x, y: result.ball.y };
          setSwing({
            ...current,
            state: 'RESOLVED',
            ballPosition: { x: result.ball.x, y: result.ball.y },
            outcome: { kind, restPosition },
          });
        } else {
          setSwing({ ...current, ballPosition: { x: result.ball.x, y: result.ball.y } });
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [frictionScale, maxPuttSpeedMultiplier, gestureRef]);

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
