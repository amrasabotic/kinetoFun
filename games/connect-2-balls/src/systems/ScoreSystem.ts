export function calculateScore(
  timeSeconds: number,
  mistakes: number,
  hintsUsed: number,
  gridSize: number,
  pairCount: number
): { score: number; stars: number } {
  const baseScore = pairCount * 100 + gridSize * 50;
  const timeBonus = Math.max(0, (120 - timeSeconds) * 5);
  const mistakePenalty = mistakes * 50;
  const hintPenalty = hintsUsed * 30;
  const score = Math.max(0, baseScore + timeBonus - mistakePenalty - hintPenalty);

  let stars = 1;
  if (mistakes === 0 && hintsUsed === 0) stars = 3;
  else if (mistakes <= 1 && hintsUsed <= 1) stars = 2;

  return { score, stars };
}

export function calculateComboMultiplier(combo: number): number {
  return 1 + Math.min(combo, 10) * 0.1;
}
