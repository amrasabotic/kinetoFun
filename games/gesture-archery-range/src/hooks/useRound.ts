import { useCallback, useMemo, useRef, useState } from 'react';
import type { Difficulty, GameMode, RoundConfig, ShotResult } from '../types';
import { DIFFICULTY_CONFIG } from '../types';
import { mulberry32, dailySeed } from '../utils/helpers';

export interface ShotRecord {
  result: ShotResult;
  points: number;
}

export function useRound(mode: GameMode, difficulty: Difficulty) {
  const config: RoundConfig = DIFFICULTY_CONFIG[difficulty];
  const seed = mode === 'daily' ? dailySeed() : Math.floor(Math.random() * 1e9);
  const rngRef = useRef(mulberry32(seed));
  const [shots, setShots] = useState<ShotRecord[]>([]);

  const nextWindSeed = useCallback(() => rngRef.current(), []);

  const recordShot = useCallback((record: ShotRecord) => {
    setShots((prev) => [...prev, record]);
  }, []);

  const reset = useCallback(() => {
    const newSeed = mode === 'daily' ? dailySeed() : Math.floor(Math.random() * 1e9);
    rngRef.current = mulberry32(newSeed);
    setShots([]);
  }, [mode]);

  const score = useMemo(() => shots.reduce((s, r) => s + r.points, 0), [shots]);
  const bullseyes = useMemo(() => shots.filter((r) => r.result === 'bullseye').length, [shots]);
  const arrowsLeft = Math.max(0, config.arrowCount - shots.length);
  const roundOver = arrowsLeft === 0;

  return { config, shots, recordShot, reset, score, bullseyes, arrowsLeft, roundOver, nextWindSeed };
}
