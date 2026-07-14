export type GrowthStage = 'seed' | 'growing' | 'ripe';

export function getGrowthFraction(plantedAt: number, growMs: number, now: number): number {
  return Math.max(0, Math.min(1, (now - plantedAt) / growMs));
}

export function getGrowthStage(fraction: number): GrowthStage {
  if (fraction >= 1) return 'ripe';
  if (fraction >= 0.34) return 'growing';
  return 'seed';
}
