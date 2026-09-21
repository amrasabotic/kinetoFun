import { getGrowthFraction } from './growth';

export type MoodTier = 'joyful' | 'happy' | 'okay';
export type GrowthStage = 'baby' | 'child' | 'teen' | 'adult' | 'elder';

export interface PetStats {
  hunger: number; // 40-100
  happiness: number; // 40-100
  mood: MoodTier;
  growthStage: GrowthStage;
}

const HUNGER_DECAY_MS = 90 * 60 * 1000; // 90 minutes to decay from 100 to 40
const HAPPINESS_DECAY_MS = 180 * 60 * 1000; // 180 minutes to decay from 100 to 40
const STAT_FLOOR = 40;
const STAT_CEILING = 100;

export function computeStats(
  lastHungerTickAt: number,
  lastHappinessTickAt: number,
  totalCareActions: number,
  now: number,
): PetStats {
  const hungerFraction = getGrowthFraction(lastHungerTickAt, HUNGER_DECAY_MS, now);
  const happinessFraction = getGrowthFraction(lastHappinessTickAt, HAPPINESS_DECAY_MS, now);

  const hunger = STAT_CEILING - hungerFraction * (STAT_CEILING - STAT_FLOOR);
  const happiness = STAT_CEILING - happinessFraction * (STAT_CEILING - STAT_FLOOR);

  const mood = getMood(hunger, happiness);
  const growthStage = getStage(totalCareActions);

  return { hunger, happiness, mood, growthStage };
}

function getMood(hunger: number, happiness: number): MoodTier {
  const minStat = Math.min(hunger, happiness);
  if (minStat >= 80) return 'joyful';
  if (minStat >= 60) return 'happy';
  return 'okay';
}

function getStage(totalCareActions: number): GrowthStage {
  if (totalCareActions < 10) return 'baby';
  if (totalCareActions < 25) return 'child';
  if (totalCareActions < 50) return 'teen';
  if (totalCareActions < 100) return 'adult';
  return 'elder';
}

export const GROWTH_THRESHOLDS: Record<GrowthStage, number> = {
  baby: 0,
  child: 10,
  teen: 25,
  adult: 50,
  elder: 100,
};

export function getGrowthEmoji(stage: GrowthStage): string {
  const emojis = { baby: '🐣', child: '🐣', teen: '😊', adult: '😄', elder: '😎' };
  return emojis[stage] ?? '😊';
}
