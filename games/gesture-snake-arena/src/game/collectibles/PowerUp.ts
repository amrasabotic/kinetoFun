import type { PowerUp, PowerUpType } from '../../types';
import {
  ARENA_WIDTH, ARENA_HEIGHT,
  POWERUP_COUNT, POWERUP_LIFETIME_MS, POWERUP_DURATION_MS,
} from '../../constants/gameConfig';
import { randomRange } from '../../utils/mathUtils';

let puIdCounter = 5000;

const POWERUP_TYPES: PowerUpType[] = [
  'shield','magnet','double_score','ghost','freeze','giant_energy',
];

export const POWERUP_ICONS: Record<PowerUpType, string> = {
  shield:       '🛡️',
  magnet:       '🧲',
  double_score: '✨',
  ghost:        '👻',
  freeze:       '❄️',
  giant_energy: '⚡',
};

export const POWERUP_COLORS: Record<PowerUpType, string> = {
  shield:       '#4FC3F7',
  magnet:       '#CE93D8',
  double_score: '#FFD700',
  ghost:        '#B0BEC5',
  freeze:       '#80DEEA',
  giant_energy: '#FF8A65',
};

export const POWERUP_NAMES: Record<PowerUpType, string> = {
  shield:       'Shield',
  magnet:       'Magnet',
  double_score: '2x Score',
  ghost:        'Ghost',
  freeze:       'Freeze',
  giant_energy: 'Giant Energy',
};

export function createPowerUp(): PowerUp {
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  return {
    id: puIdCounter++,
    x: 150 + Math.random() * (ARENA_WIDTH  - 300),
    y: 150 + Math.random() * (ARENA_HEIGHT - 300),
    type,
    phase: Math.random() * Math.PI * 2,
    lifetime: POWERUP_LIFETIME_MS,
  };
}

export function initPowerUps(): PowerUp[] {
  return Array.from({ length: POWERUP_COUNT }, () => createPowerUp());
}

export function updatePowerUps(powerUps: PowerUp[], dt: number): PowerUp[] {
  const dtS = dt / 1000;
  return powerUps
    .map(pu => ({ ...pu, phase: pu.phase + dtS * 2, lifetime: pu.lifetime - dt }))
    .filter(pu => pu.lifetime > 0);
}

export function getPowerUpDuration(_type: PowerUpType): number {
  return POWERUP_DURATION_MS;
}
