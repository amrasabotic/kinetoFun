import type { DartOutcome } from '../types';

export interface X01ApplyResult {
  remaining: number; // only meaningful when !bust
  bust: boolean;
  won: boolean;
}

/**
 * Applies one dart to an X01 (301/501) running score, enforcing the real
 * bust rules: going below zero, or landing exactly on 1 (unfinishable,
 * since the lowest possible checkout is double-1 = 2), busts the throw.
 * Reaching exactly zero only wins if the *last* dart was a double (the
 * double-bull's multiplier of 2 counts the same way real double-out rules
 * treat it) — otherwise that's a bust too. A bust voids the entire
 * turn/visit, not just this dart; reverting to the turn-start score is the
 * caller's job (see systems/matchEngine.ts), since this function only sees
 * one dart at a time.
 */
export function applyX01Throw(currentScore: number, outcome: DartOutcome): X01ApplyResult {
  const isDoubleFinish = outcome.multiplier === 2; // covers the double ring and the double-bull
  const remaining = currentScore - outcome.points;

  if (remaining < 0 || remaining === 1) {
    return { remaining: currentScore, bust: true, won: false };
  }
  if (remaining === 0) {
    if (isDoubleFinish) return { remaining: 0, bust: false, won: true };
    return { remaining: currentScore, bust: true, won: false };
  }
  return { remaining, bust: false, won: false };
}
