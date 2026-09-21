import { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty, GameMode, MatchState } from '../types';
import { createMatch, submitPlayerAnswer, submitTimeout, advanceRound } from '../systems/matchEngine';
import { mulberry32, dailySeed } from '../utils/helpers';
import { sfx } from '../systems/audio';

function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}

const REVEAL_PAUSE_MS = 3200;

/**
 * Owns the whole match: the question sequence, whose round it is, and both
 * players' running score. The CPU's answer for the current round is always
 * already decided the moment that round starts (see matchEngine's
 * `cpuOutcome`) — there's no async CPU turn to simulate, so this hook's only
 * real job beyond exposing actions is auto-advancing from the REVEAL screen
 * after a short pause so the player isn't required to dwell a "Next"
 * button every round (though GameScreen still offers one, to skip ahead).
 */
export function useMatch(mode: GameMode, difficulty: Difficulty, isDaily: boolean) {
  const seedRef = useRef(mulberry32(isDaily ? dailySeed() : randomSeed()));
  const [match, setMatch] = useState<MatchState>(() => createMatch(mode, difficulty, isDaily, seedRef.current));

  const answer = useCallback((selectedIndex: number, answerMs: number) => {
    setMatch((prev) => {
      if (prev.phase !== 'ANSWERING') return prev;
      const next = submitPlayerAnswer(prev, selectedIndex, answerMs);
      sfx[next.playerCorrect ? 'correct' : 'wrong']();
      return next;
    });
  }, []);

  const timeout = useCallback(() => {
    setMatch((prev) => {
      if (prev.phase !== 'ANSWERING') return prev;
      sfx.timeout();
      return submitTimeout(prev);
    });
  }, []);

  const advance = useCallback(() => {
    setMatch((prev) => advanceRound(prev, seedRef.current));
  }, []);

  useEffect(() => {
    if (match.phase !== 'REVEAL') return;
    const timer = window.setTimeout(advance, REVEAL_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [match.phase, match.roundIndex, advance]);

  useEffect(() => {
    if (!match.winner) return;
    sfx[match.winner === 'you' ? 'victory' : match.winner === 'cpu' ? 'defeat' : 'tie']();
  }, [match.winner]);

  const reset = useCallback(() => {
    seedRef.current = mulberry32(isDaily ? dailySeed() : randomSeed());
    setMatch(createMatch(mode, difficulty, isDaily, seedRef.current));
  }, [mode, difficulty, isDaily]);

  return { match, answer, timeout, advance, reset };
}
