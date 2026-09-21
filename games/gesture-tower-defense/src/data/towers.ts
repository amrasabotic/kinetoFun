import type { TowerDef, TowerTypeId } from '../types';

export const TOWER_DEFS: Record<TowerTypeId, TowerDef> = {
  blaster: {
    id: 'blaster',
    name: 'Blaster',
    cost: 50,
    damage: 8,
    range: 0.22,
    fireRateMs: 400,
    projectileSpeed: 1.3,
    splashRadius: 0,
    slowFactor: 0,
    slowDurationMs: 0,
    color: '#38bdf8',
  },
  cannon: {
    id: 'cannon',
    name: 'Cannon',
    cost: 100,
    damage: 30,
    range: 0.2,
    fireRateMs: 1400,
    projectileSpeed: 0.9,
    splashRadius: 0.08,
    slowFactor: 0,
    slowDurationMs: 0,
    color: '#fb923c',
  },
  frost: {
    id: 'frost',
    name: 'Frost',
    cost: 75,
    damage: 4,
    range: 0.24,
    fireRateMs: 900,
    projectileSpeed: 1.0,
    splashRadius: 0,
    slowFactor: 0.5,
    slowDurationMs: 1500,
    color: '#22d3ee',
  },
};

export const TOWER_ORDER: TowerTypeId[] = ['blaster', 'cannon', 'frost'];

/** Selling a placed tower refunds a fraction of its cost — never full price, so spamming place/sell isn't free re-optimization. */
export const SELL_REFUND_FRACTION = 0.6;
