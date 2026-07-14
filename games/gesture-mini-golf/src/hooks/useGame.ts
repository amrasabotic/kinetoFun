import { useCallback, useMemo, useState } from 'react';
import type { Difficulty, GameMode, HoleDef, StrokeOutcome } from '../types';
import { DIFFICULTY_CONFIG } from '../types';
import { COURSE } from '../systems/courseData';
import { toLeaderboardScore, totalStrokes, type HoleResult } from '../systems/scoringEngine';
import { mulberry32, dailySeed } from '../utils/helpers';

function buildEffectiveHole(base: HoleDef, cupRadiusMultiplier: number): HoleDef {
  return { ...base, cupRadius: base.cupRadius * cupRadiusMultiplier };
}

export function useGame(mode: GameMode, difficulty: Difficulty) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const holes = useMemo(() => COURSE.slice(0, config.holeCount), [config.holeCount]);

  const [holeIndex, setHoleIndex] = useState(0);
  const [strokesThisHole, setStrokesThisHole] = useState(0);
  const [results, setResults] = useState<HoleResult[]>([]);
  const [ballStart, setBallStart] = useState({ x: holes[0].tee.x, y: holes[0].tee.y });

  const frictionScale = useMemo(() => {
    if (mode !== 'daily') return 1;
    const rng = mulberry32(dailySeed());
    return 0.85 + rng() * 0.3; // a subtle, shared "green speed" for everyone today
  }, [mode]);

  const currentHole = useMemo(
    () => buildEffectiveHole(holes[holeIndex], config.cupRadiusMultiplier),
    [holes, holeIndex, config.cupRadiusMultiplier],
  );

  const courseComplete = holeIndex >= holes.length;

  const recordStroke = useCallback(
    (outcome: StrokeOutcome) => {
      setStrokesThisHole((s) => s + 1 + (outcome.kind === 'water' ? 1 : 0)); // water is a one-stroke penalty
      if (outcome.kind === 'holed') {
        setResults((prev) => [...prev, { par: currentHole.par, strokes: strokesThisHole + 1 }]);
        setHoleIndex((i) => i + 1);
        setStrokesThisHole(0);
        const next = holes[holeIndex + 1];
        if (next) setBallStart({ x: next.tee.x, y: next.tee.y });
      } else {
        setBallStart(outcome.restPosition);
      }
    },
    [currentHole.par, strokesThisHole, holes, holeIndex],
  );

  const reset = useCallback(() => {
    setHoleIndex(0);
    setStrokesThisHole(0);
    setResults([]);
    setBallStart({ x: holes[0].tee.x, y: holes[0].tee.y });
  }, [holes]);

  const totalScore = useMemo(() => totalStrokes(results), [results]);
  const leaderboardScore = useMemo(() => toLeaderboardScore(results), [results]);
  const holesInOne = useMemo(() => results.filter((r) => r.strokes === 1).length, [results]);

  return {
    holes,
    holeIndex,
    currentHole,
    strokesThisHole,
    results,
    ballStart,
    frictionScale,
    maxPuttSpeedMultiplier: config.maxPuttSpeedMultiplier,
    courseComplete,
    totalScore,
    leaderboardScore,
    holesInOne,
    recordStroke,
    reset,
  };
}
