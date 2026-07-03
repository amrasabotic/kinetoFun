export type CareItemKind = 'food' | 'toy' | 'accessory';
export type CareItemId = 'treat' | 'fruit' | 'veggies' | 'ball' | 'rope' | 'stick' | 'hat' | 'bandana' | 'glasses';

export interface CareItem {
  id: CareItemId;
  name: string;
  emoji: string;
  kind: CareItemKind;
  unlockCost: number; // 0 = unlocked from the start
  restoreAmount: number; // how much Hunger/Happiness it restores (for food/toys)
}

export const CARE_ITEMS: CareItem[] = [
  // Foods (always restore Hunger)
  { id: 'treat', name: 'Treat', emoji: '🍪', kind: 'food', unlockCost: 0, restoreAmount: 40 },
  { id: 'fruit', name: 'Fruit', emoji: '🍎', kind: 'food', unlockCost: 15, restoreAmount: 50 },
  { id: 'veggies', name: 'Veggies', emoji: '🥕', kind: 'food', unlockCost: 25, restoreAmount: 55 },

  // Toys (always restore Happiness)
  { id: 'ball', name: 'Ball', emoji: '⚽', kind: 'toy', unlockCost: 0, restoreAmount: 40 },
  { id: 'rope', name: 'Rope Toy', emoji: '🧶', kind: 'toy', unlockCost: 15, restoreAmount: 50 },
  { id: 'stick', name: 'Stick', emoji: '🪵', kind: 'toy', unlockCost: 25, restoreAmount: 55 },

  // Accessories (pure cosmetic, unlock free pet customization)
  { id: 'hat', name: 'Hat', emoji: '🎩', kind: 'accessory', unlockCost: 10, restoreAmount: 0 },
  { id: 'bandana', name: 'Bandana', emoji: '🎀', kind: 'accessory', unlockCost: 10, restoreAmount: 0 },
  { id: 'glasses', name: 'Glasses', emoji: '🕶️', kind: 'accessory', unlockCost: 10, restoreAmount: 0 },
];

export function itemById(id: string): CareItem | undefined {
  return CARE_ITEMS.find((i) => i.id === id);
}

export function itemsByKind(kind: CareItemKind): CareItem[] {
  return CARE_ITEMS.filter((i) => i.kind === kind);
}
