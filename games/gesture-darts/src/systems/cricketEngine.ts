import type { DartOutcome } from '../types';

/** The seven cricket "numbers" — 15 through 20, plus the bull (25). */
export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25] as const;
export type CricketNumber = (typeof CRICKET_NUMBERS)[number];

/** Marks accumulated per number, 0..3. A number is "closed" once a player reaches 3. */
export type CricketMarks = Record<CricketNumber, number>;

export function initialCricketMarks(): CricketMarks {
  return { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 };
}

export interface CricketApplyResult {
  marks: CricketMarks;
  scoreDelta: number;
}

/**
 * Applies one dart to a player's cricket marks/score. A dart on a tracked
 * number contributes `outcome.multiplier` marks (single=1, double=2,
 * triple=3 — the outer/inner bull split from scoreImpact both map to the
 * "number" 25, contributing 1 or 2 marks respectively, since a dartboard has
 * no bull triple). Once a number reaches 3 marks it's closed for that
 * player; any further marks on it only score points if the opponent hasn't
 * also closed that same number — points equal the sector's face value
 * (25 for bull) times the overflow marks beyond what was needed to close.
 */
export function applyCricketThrow(
  marks: CricketMarks,
  opponentMarks: CricketMarks,
  outcome: DartOutcome,
): CricketApplyResult {
  const num = outcome.sector as CricketNumber;
  if (!(CRICKET_NUMBERS as readonly number[]).includes(num) || outcome.multiplier === 0) {
    return { marks, scoreDelta: 0 };
  }

  const before = marks[num];
  const opponentClosed = opponentMarks[num] >= 3;
  const marksToClose = Math.min(outcome.multiplier, 3 - before);
  const overflow = outcome.multiplier - marksToClose;

  const nextMarks: CricketMarks = { ...marks, [num]: before + marksToClose };
  // True both the turn a number first reaches 3 marks and on every later
  // dart once it's already closed — either way, from here on any overflow
  // marks are pure points rather than marks-toward-closing.
  const closed = before + marksToClose === 3;
  const scoreDelta = closed && !opponentClosed ? overflow * num : 0;

  return { marks: nextMarks, scoreDelta };
}

export function isCricketClosed(marks: CricketMarks): boolean {
  return CRICKET_NUMBERS.every((n) => marks[n] >= 3);
}
