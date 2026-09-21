export interface HoleResult {
  par: number;
  strokes: number;
}

export function relativeToParLabel(strokes: number, par: number): string {
  const diff = strokes - par;
  if (strokes === 1) return 'Hole in One!';
  if (diff <= -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double Bogey';
  return `+${diff}`;
}

export function totalStrokes(results: HoleResult[]): number {
  return results.reduce((sum, r) => sum + r.strokes, 0);
}

export function totalPar(results: HoleResult[]): number {
  return results.reduce((sum, r) => sum + r.par, 0);
}

/**
 * Converts a stroke-play round into a leaderboard-friendly score where a
 * higher number is better, matching the platform-wide "higher score wins"
 * convention even though golf itself scores lowest-strokes-wins.
 */
export function toLeaderboardScore(results: HoleResult[]): number {
  const strokes = totalStrokes(results);
  const par = totalPar(results);
  const baseline = par * 3; // a very poor round (3x par) floors at 0
  return Math.max(0, (baseline - strokes) * 10);
}
