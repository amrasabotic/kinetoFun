import type { GateDef } from '../../types';
import type { WeightedEntry } from '../../utils/mathUtils';

export const GATE_DEFS: Record<string, GateDef> = {
  add5:  { id: 'add5',  label: '+5',  op: 'add',      value: 5,   color: '#4ADE80', minTier: 1, weight: 12 },
  add10: { id: 'add10', label: '+10', op: 'add',      value: 10,  color: '#4ADE80', minTier: 1, weight: 10 },
  add15: { id: 'add15', label: '+15', op: 'add',      value: 15,  color: '#22D3EE', minTier: 2, weight: 8 },
  add20: { id: 'add20', label: '+20', op: 'add',      value: 20,  color: '#22D3EE', minTier: 2, weight: 6 },
  add40: { id: 'add40', label: '+40', op: 'add',      value: 40,  color: '#FACC15', minTier: 4, weight: 3 },
  mul2:  { id: 'mul2',  label: 'x2',  op: 'multiply', value: 2,   color: '#FB923C', minTier: 2, weight: 6 },
  mul3:  { id: 'mul3',  label: 'x3',  op: 'multiply', value: 3,   color: '#F87171', minTier: 4, weight: 3 },
  mul4:  { id: 'mul4',  label: 'x4',  op: 'multiply', value: 4,   color: '#F472B6', minTier: 5, weight: 2 },
  sub10: { id: 'sub10', label: '-10', op: 'add',      value: -10, color: '#94A3B8', minTier: 1, weight: 7 },
  half:  { id: 'half',  label: 'x0.5', op: 'multiply', value: 0.5, color: '#94A3B8', minTier: 2, weight: 5 },
};

export function gatePool(maxTier: number): WeightedEntry<GateDef>[] {
  return Object.values(GATE_DEFS)
    .filter((g) => g.minTier <= maxTier)
    .map((item) => ({ item, weight: item.weight }));
}

export function applyGate(count: number, def: GateDef): number {
  const result = def.op === 'add' ? count + def.value : count * def.value;
  return Math.max(0, Math.round(result));
}
