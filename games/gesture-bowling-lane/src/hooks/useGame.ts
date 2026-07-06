import { useCallback, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameMode, RollOutcome } from '../types';
import { DIFFICULTY_CONFIG } from '../types';
import { computeFrames, initialRollContext, advanceRollContext } from '../systems/scoringEngine';
import { mulberry32, dailySeed } from '../utils/helpers';

export function useGame(mode: GameMode, difficulty: Difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const [rolls, setRolls] = useState<number[]>([]);
  const [rollContext, setRollContext] = useState(initialRollContext());
  // Only the 10th frame's rules need to know the first ball's pinfall when
  // scoring the second ball (was it a strike, opening a reset rack?).
  const tenthFrameFirstBallRef = useRef<number | null>(null);

  const laneBias = useMemo(() => {
    if (mode !== 'daily') return 0;
    const rng = mulberry32(dailySeed());
    return (rng() * 2 - 1) * 0.25; // a subtle, shared "oil pattern" drift for everyone today
  }, [mode]);

  const recordRoll = useCallback((outcome: RollOutcome) => {
    const pinfall = outcome.isGutter ? 0 : outcome.knockedPinIds.length;
    setRolls((prev) => [...prev, pinfall]);
    setRollContext((prev) => {
      const isTenth = prev.frameIndex === 9;
      if (isTenth && prev.ballInFrame === 0) {
        tenthFrameFirstBallRef.current = pinfall;
      }
      const priorPinfallThisFrame = isTenth && prev.ballInFrame === 1 ? tenthFrameFirstBallRef.current : null;
      return advanceRollContext(prev, pinfall, priorPinfallThisFrame);
    });
  }, []);

  const reset = useCallback(() => {
    setRolls([]);
    setRollContext(initialRollContext());
    tenthFrameFirstBallRef.current = null;
  }, []);

  const frames = useMemo(() => computeFrames(rolls), [rolls]);
  const score = useMemo(() => {
    for (let i = frames.length - 1; i >= 0; i--) {
      if (frames[i].cumulative !== null) return frames[i].cumulative as number;
    }
    return 0;
  }, [frames]);
  const strikes = useMemo(() => frames.filter((f) => f.isStrike).length, [frames]);
  const gameOver = rollContext.gameOver;

  return {
    config,
    laneBias,
    rolls,
    frames,
    frameIndex: rollContext.frameIndex,
    ballInFrame: rollContext.ballInFrame,
    standingPinIds: rollContext.standingPinIds,
    score,
    strikes,
    gameOver,
    recordRoll,
    reset,
  };
}
