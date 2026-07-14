import type { ObstacleDef } from '../../types';
import type { WeightedEntry } from '../../utils/mathUtils';

export const OBSTACLE_DEFS: Record<string, ObstacleDef> = {
  rotatingHammer: {
    id: 'rotatingHammer', kind: 'hammer', label: 'Rotating Hammer',
    crowdDamage: 8, chargeModeDestructible: true, laneSpan: 1.6, animSpeedMs: 1400, minTier: 1, weight: 10,
  },
  swingingAxe: {
    id: 'swingingAxe', kind: 'axe', label: 'Swinging Axe',
    crowdDamage: 10, chargeModeDestructible: true, laneSpan: 2.0, animSpeedMs: 1600, minTier: 1, weight: 9,
  },
  movingWall: {
    id: 'movingWall', kind: 'wall', label: 'Moving Wall',
    crowdDamage: 14, chargeModeDestructible: false, laneSpan: 2.6, animSpeedMs: 2200, minTier: 2, weight: 7,
  },
  rollingBarrel: {
    id: 'rollingBarrel', kind: 'barrel', label: 'Rolling Barrel',
    crowdDamage: 6, chargeModeDestructible: true, laneSpan: 1.1, animSpeedMs: 900, minTier: 1, weight: 10,
  },
  spikeTrap: {
    id: 'spikeTrap', kind: 'spike', label: 'Spike Trap',
    crowdDamage: 12, chargeModeDestructible: false, laneSpan: 1.8, animSpeedMs: 1000, minTier: 2, weight: 8,
  },
  laserBeam: {
    id: 'laserBeam', kind: 'laser', label: 'Laser Beam',
    crowdDamage: 18, chargeModeDestructible: false, laneSpan: 3.2, animSpeedMs: 1800, minTier: 3, weight: 6,
  },
  crusher: {
    id: 'crusher', kind: 'crusher', label: 'Crusher',
    crowdDamage: 20, chargeModeDestructible: true, laneSpan: 2.4, animSpeedMs: 2000, minTier: 3, weight: 6,
  },
  sawBlade: {
    id: 'sawBlade', kind: 'saw', label: 'Saw Blade',
    crowdDamage: 9, chargeModeDestructible: true, laneSpan: 1.4, animSpeedMs: 700, minTier: 2, weight: 9,
  },
};

export function obstaclePool(maxTier: number): WeightedEntry<ObstacleDef>[] {
  return Object.values(OBSTACLE_DEFS)
    .filter((o) => o.minTier <= maxTier)
    .map((item) => ({ item, weight: item.weight }));
}
