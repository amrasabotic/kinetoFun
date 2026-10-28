export interface ZooItemDef {
  id: string;
  name: string;
  emoji: string;
  kind: 'animal' | 'decoration';
  zoneId: string;
  unlockCost: number; // tickets, 0 = unlocked from the start
  appealValue: number; // contributes to the zone's (and zoo's) total appeal score
  /** Decoration that makes this animal happy when placed in the same zone, doubling its appeal. */
  likes?: string;
}

export const ZOO_ITEMS: ZooItemDef[] = [
  // ── Savanna (starter zone) ──────────────────────────────────────────────
  { id: 'lion', name: 'Lion', emoji: '🦁', kind: 'animal', zoneId: 'savanna', unlockCost: 0, appealValue: 8, likes: 'savanna-rock' },
  { id: 'elephant', name: 'Elephant', emoji: '🐘', kind: 'animal', zoneId: 'savanna', unlockCost: 20, appealValue: 10, likes: 'watering-hole' },
  { id: 'giraffe', name: 'Giraffe', emoji: '🦒', kind: 'animal', zoneId: 'savanna', unlockCost: 25, appealValue: 9, likes: 'acacia-tree' },
  { id: 'zebra', name: 'Zebra', emoji: '🦓', kind: 'animal', zoneId: 'savanna', unlockCost: 15, appealValue: 7, likes: 'savanna-rock' },
  { id: 'acacia-tree', name: 'Acacia Tree', emoji: '🌳', kind: 'decoration', zoneId: 'savanna', unlockCost: 5, appealValue: 3 },
  { id: 'savanna-rock', name: 'Tall Grass', emoji: '🌾', kind: 'decoration', zoneId: 'savanna', unlockCost: 5, appealValue: 2 },
  { id: 'watering-hole', name: 'Watering Hole', emoji: '💧', kind: 'decoration', zoneId: 'savanna', unlockCost: 10, appealValue: 4 },

  // ── Arctic ───────────────────────────────────────────────────────────────
  { id: 'polar-bear', name: 'Polar Bear', emoji: '🐻', kind: 'animal', zoneId: 'arctic', unlockCost: 30, appealValue: 11, likes: 'ice-block' },
  { id: 'penguin', name: 'Penguin', emoji: '🐧', kind: 'animal', zoneId: 'arctic', unlockCost: 15, appealValue: 7, likes: 'ice-block' },
  { id: 'seal', name: 'Reindeer', emoji: '🦌', kind: 'animal', zoneId: 'arctic', unlockCost: 18, appealValue: 8, likes: 'igloo' },
  { id: 'arctic-fox', name: 'Arctic Fox', emoji: '🦊', kind: 'animal', zoneId: 'arctic', unlockCost: 20, appealValue: 8, likes: 'igloo' },
  { id: 'igloo', name: 'Igloo', emoji: '🏔️', kind: 'decoration', zoneId: 'arctic', unlockCost: 8, appealValue: 3 },
  { id: 'ice-block', name: 'Snowflake', emoji: '❄️', kind: 'decoration', zoneId: 'arctic', unlockCost: 5, appealValue: 2 },

  // ── Ocean / Aquarium ─────────────────────────────────────────────────────
  { id: 'dolphin', name: 'Dolphin', emoji: '🐬', kind: 'animal', zoneId: 'ocean', unlockCost: 25, appealValue: 10, likes: 'coral' },
  { id: 'whale', name: 'Whale', emoji: '🐳', kind: 'animal', zoneId: 'ocean', unlockCost: 40, appealValue: 14, likes: 'seaweed' },
  { id: 'sea-turtle', name: 'Sea Turtle', emoji: '🐢', kind: 'animal', zoneId: 'ocean', unlockCost: 18, appealValue: 7, likes: 'seaweed' },
  { id: 'clownfish', name: 'Clownfish', emoji: '🐠', kind: 'animal', zoneId: 'ocean', unlockCost: 10, appealValue: 5, likes: 'coral' },
  { id: 'octopus', name: 'Octopus', emoji: '🐙', kind: 'animal', zoneId: 'ocean', unlockCost: 22, appealValue: 9, likes: 'coral' },
  { id: 'coral', name: 'Sea Shell', emoji: '🐚', kind: 'decoration', zoneId: 'ocean', unlockCost: 8, appealValue: 4 },
  { id: 'seaweed', name: 'Seaweed', emoji: '🌿', kind: 'decoration', zoneId: 'ocean', unlockCost: 5, appealValue: 2 },

  // ── Rainforest ───────────────────────────────────────────────────────────
  { id: 'tiger', name: 'Tiger', emoji: '🐯', kind: 'animal', zoneId: 'rainforest', unlockCost: 35, appealValue: 12, likes: 'palm-tree' },
  { id: 'gorilla', name: 'Gorilla', emoji: '🦍', kind: 'animal', zoneId: 'rainforest', unlockCost: 30, appealValue: 11, likes: 'palm-tree' },
  { id: 'parrot', name: 'Parrot', emoji: '🦜', kind: 'animal', zoneId: 'rainforest', unlockCost: 12, appealValue: 6, likes: 'flower-bush' },
  { id: 'monkey', name: 'Monkey', emoji: '🐒', kind: 'animal', zoneId: 'rainforest', unlockCost: 15, appealValue: 7, likes: 'palm-tree' },
  { id: 'sloth', name: 'Sloth', emoji: '🦥', kind: 'animal', zoneId: 'rainforest', unlockCost: 18, appealValue: 8, likes: 'flower-bush' },
  { id: 'palm-tree', name: 'Palm Tree', emoji: '🌴', kind: 'decoration', zoneId: 'rainforest', unlockCost: 6, appealValue: 3 },
  { id: 'flower-bush', name: 'Flower Bush', emoji: '🌺', kind: 'decoration', zoneId: 'rainforest', unlockCost: 5, appealValue: 2 },
];

export function itemById(id: string): ZooItemDef | undefined {
  return ZOO_ITEMS.find((i) => i.id === id);
}

export function itemsByZone(zoneId: string): ZooItemDef[] {
  return ZOO_ITEMS.filter((i) => i.zoneId === zoneId);
}
