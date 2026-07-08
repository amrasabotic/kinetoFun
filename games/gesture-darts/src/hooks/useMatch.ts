import { useCallback, useEffect, useRef, useState } from 'react';
import type { DartOutcome, Difficulty, GameMode, PlayerId } from '../types';
import { DIFFICULTY_AI } from '../types';
import { applyDart, initialMatch, type MatchState } from '../systems/matchEngine';
import { simulateAiThrow } from '../systems/aiOpponent';
import { mulberry32, dailySeed } from '../utils/helpers';
import { sfx } from '../systems/audio';

function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}

/**
 * Owns the whole match: whose turn it is, both players' running
 * score/marks, and the CPU opponent's own simulated darts. The player's
 * darts arrive via `throwDart('you', outcome)` from useThrow's onResolved;
 * this hook drives the CPU's three darts itself on a short timer once it's
 * `CPU_TURN`, using the exact same applyDart/resolveThrow path so both
 * sides play by identical rules.
 */
export function useMatch(mode: GameMode, difficulty: Difficulty, isDaily: boolean) {
  const [match, setMatch] = useState<MatchState>(() => initialMatch(mode));
  const seedRef = useRef(mulberry32(isDaily ? dailySeed() : randomSeed()));
  const nextJitterSeed = useCallback(() => seedRef.current(), []);

  const throwDart = useCallback((player: PlayerId, outcome: DartOutcome) => {
    setMatch((prev) => {
      const next = applyDart(prev, player, outcome);
      if (next.winner) {
        sfx[next.winner === 'you' ? 'victory' : 'defeat']();
      } else if (next.bustFlash) {
        sfx.bust();
      } else {
        sfx.hit(outcome.ring);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (match.phase !== 'CPU_TURN') return;
    const aiProfile = DIFFICULTY_AI[difficulty];
    const timer = window.setTimeout(() => {
      const outcome = simulateAiThrow(mode, aiProfile, nextJitterSeed, {
        remaining: match.cpu.score,
        marks: match.cpu.marks,
        opponentMarks: match.you.marks,
      });
      throwDart('cpu', outcome);
    }, aiProfile.thinkMs);
    return () => window.clearTimeout(timer);
  }, [match.phase, match.dartsThisTurn, match.cpu, match.you.marks, difficulty, mode, nextJitterSeed, throwDart]);

  const reset = useCallback(() => {
    seedRef.current = mulberry32(isDaily ? dailySeed() : randomSeed());
    setMatch(initialMatch(mode));
  }, [mode, isDaily]);

  return { match, throwDart, reset };
}
