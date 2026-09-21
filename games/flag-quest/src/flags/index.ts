import type { Continent, FlagDef } from '../types';
import { EUROPE_FLAGS } from './data/europe';
import { ASIA_FLAGS } from './data/asia';
import { AFRICA_FLAGS } from './data/africa';
import { NORTH_AMERICA_FLAGS } from './data/northAmerica';
import { SOUTH_AMERICA_FLAGS } from './data/southAmerica';
import { OCEANIA_FLAGS } from './data/oceania';

export const CONTINENT_ORDER: Continent[] = [
  'Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania',
];

export const ALL_FLAGS: FlagDef[] = [
  ...EUROPE_FLAGS,
  ...ASIA_FLAGS,
  ...AFRICA_FLAGS,
  ...NORTH_AMERICA_FLAGS,
  ...SOUTH_AMERICA_FLAGS,
  ...OCEANIA_FLAGS,
];

const BY_ID = new Map(ALL_FLAGS.map((f) => [f.id, f]));

export function getFlagById(id: string): FlagDef | undefined {
  return BY_ID.get(id);
}

export function getFlagsByContinent(continent: Continent): FlagDef[] {
  return ALL_FLAGS.filter((f) => f.continent === continent);
}

const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2, expert: 3 } as const;

/** All flags sorted easiest-first, used to build the Endless mode queue. */
export function flagsByAscendingDifficulty(): FlagDef[] {
  return [...ALL_FLAGS].sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
}

export function randomFlag(excludeId?: string): FlagDef {
  const pool = excludeId ? ALL_FLAGS.filter((f) => f.id !== excludeId) : ALL_FLAGS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Picks a flag for Endless mode: difficulty gradually ramps up with the round number. */
export function pickEndlessFlag(round: number, excludeId?: string): FlagDef {
  const sorted = flagsByAscendingDifficulty();
  const windowSize = Math.min(sorted.length, 6);
  const center = Math.min(sorted.length - 1, Math.floor(round * 1.5));
  const lo = Math.max(0, center - windowSize);
  const hi = Math.min(sorted.length - 1, center + 2);
  const slice = sorted.slice(lo, hi + 1).filter((f) => f.id !== excludeId);
  const pool = slice.length > 0 ? slice : sorted;
  return pool[Math.floor(Math.random() * pool.length)];
}
