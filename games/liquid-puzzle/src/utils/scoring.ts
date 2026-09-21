export interface ScoreInput {
  movesUsed: number;
  parMoves: number | null; // shortest-solution length from utils/solver.ts, or null if the search budget was exceeded
  hintsUsed: number;
  undosUsed: number;
  emptyTubesRemaining: number;
  elapsedMs: number;
}

/**
 * 1-3 stars from moves-vs-par and hint usage. When par is unavailable (a
 * rare, very-scrambled board exceeding the solver's search budget — see
 * utils/solver.ts), grading falls back to hints-used alone rather than
 * failing to award any stars.
 */
export function computeStars(input: ScoreInput): 1 | 2 | 3 {
  const { movesUsed, parMoves, hintsUsed } = input;

  if (parMoves === null) {
    if (hintsUsed === 0) return 3;
    if (hintsUsed === 1) return 2;
    return 1;
  }

  const overPar = movesUsed - parMoves;
  if (hintsUsed === 0 && overPar <= 0) return 3;
  if (hintsUsed <= 1 && overPar <= Math.max(2, Math.round(parMoves * 0.5))) return 2;
  return 1;
}

/** A single numeric score for the leaderboard/statistics — rewards fewer moves, fewer hints/undos, and speed. */
export function computeScore(input: ScoreInput): number {
  const { movesUsed, parMoves, hintsUsed, undosUsed, emptyTubesRemaining, elapsedMs } = input;
  let score = 1000;
  if (parMoves !== null) score -= Math.max(0, movesUsed - parMoves) * 20;
  score -= hintsUsed * 80;
  score -= undosUsed * 10;
  score += emptyTubesRemaining * 30;
  score += Math.max(0, 200 - elapsedMs / 1000);
  return Math.max(50, Math.round(score));
}
