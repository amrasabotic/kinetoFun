import type { WaveDef, WaveSpawn } from '../types';

const SPACING_MS = 550;

/**
 * Procedurally generates a wave's enemy composition and spawn timing from
 * just the wave number — difficulty grows through enemy *count* and a
 * shifting mix (more runners, then tanks, as waves climb) rather than
 * scaling individual enemies' stats, so the fixed `ENEMY_DEFS` table stays
 * the single source of truth for what a "grunt" or "tank" is at any wave.
 * `rng` is the only source of randomness, so passing a seeded generator
 * (see utils/helpers.ts's `mulberry32`) makes Daily mode's waves identical
 * for every player on a given day, the same convention as every other
 * seeded-daily game in this catalog.
 */
export function generateWave(waveNumber: number, rng: () => number): WaveDef {
  const n = Math.max(0, waveNumber);
  const count = 5 + Math.floor(n * 1.6);
  const tankChance = Math.min(0.35, n * 0.03);
  const runnerChance = Math.min(0.4, 0.1 + n * 0.02);

  const spawns: WaveSpawn[] = [];
  for (let i = 0; i < count; i++) {
    const r = rng();
    let defId = 'grunt';
    if (r < tankChance) defId = 'tank';
    else if (r < tankChance + runnerChance) defId = 'runner';
    spawns.push({ defId, delayMs: i * SPACING_MS });
  }

  return { index: n, spawns };
}
