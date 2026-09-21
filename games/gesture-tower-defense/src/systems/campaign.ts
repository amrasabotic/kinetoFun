import { MAPS } from '../data/maps';

export const CAMPAIGN_LEVEL_COUNT = 15;

export interface CampaignLevelConfig {
  mapId: string;
  totalWaves: number;
  startingCurrency: number;
  startingBaseHealth: number;
}

/** Cycles through the hand-authored maps while waves-per-level grows — the same "few templates, procedural scaling" pattern this catalog's other multi-level games use (mini-golf's holes, bowling's lanes). */
export function campaignLevelConfig(level: number): CampaignLevelConfig {
  const map = MAPS[(level - 1) % MAPS.length];
  return {
    mapId: map.id,
    totalWaves: 4 + Math.floor((level - 1) / 2),
    startingCurrency: 150,
    startingBaseHealth: 20,
  };
}
