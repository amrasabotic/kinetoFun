export type CropId = 'carrot' | 'tomato' | 'corn' | 'pumpkin';

export interface CropType {
  id: CropId;
  name: string;
  seedEmoji: string;
  sproutEmoji: string;
  ripeEmoji: string;
  growMs: number;
  seedCost: number;
  sellValue: number;
  unlockCost: number; // 0 = unlocked from the start
}

export const CROPS: CropType[] = [
  {
    id: 'carrot', name: 'Carrot',
    seedEmoji: '\u{1F7E4}', sproutEmoji: '\u{1F331}', ripeEmoji: '\u{1F955}',
    growMs: 20_000, seedCost: 2, sellValue: 5, unlockCost: 0,
  },
  {
    id: 'tomato', name: 'Tomato',
    seedEmoji: '\u{1F7E4}', sproutEmoji: '\u{1F33F}', ripeEmoji: '\u{1F345}',
    growMs: 60_000, seedCost: 4, sellValue: 10, unlockCost: 15,
  },
  {
    id: 'corn', name: 'Corn',
    seedEmoji: '\u{1F7E4}', sproutEmoji: '\u{1F33E}', ripeEmoji: '\u{1F33D}',
    growMs: 180_000, seedCost: 6, sellValue: 16, unlockCost: 35,
  },
  {
    id: 'pumpkin', name: 'Pumpkin',
    seedEmoji: '\u{1F7E4}', sproutEmoji: '\u{1F343}', ripeEmoji: '\u{1F383}',
    growMs: 480_000, seedCost: 10, sellValue: 28, unlockCost: 60,
  },
];

export function cropById(id: string): CropType | undefined {
  return CROPS.find((c) => c.id === id);
}

/** Coin cost to unlock the plot at this index (0-based); first FREE_PLOT_COUNT plots are free. */
export const FREE_PLOT_COUNT = 4;
export const MAX_PLOT_COUNT = 12;

export function plotUnlockCost(plotIndex: number): number {
  if (plotIndex < FREE_PLOT_COUNT) return 0;
  return 15 + (plotIndex - FREE_PLOT_COUNT) * 10;
}
