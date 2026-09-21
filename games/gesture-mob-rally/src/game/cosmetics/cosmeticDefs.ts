import type { CosmeticItem } from '../../types';

export interface ColorTheme { id: string; label: string; color: string; glow: string; cost: number; }

export const COLOR_THEMES: ColorTheme[] = [
  { id: 'blue', label: 'Sky Blue', color: '#3B82F6', glow: '#93C5FD', cost: 0 },
  { id: 'orange', label: 'Ember Orange', color: '#FB923C', glow: '#FED7AA', cost: 150 },
  { id: 'violet', label: 'Royal Violet', color: '#8B5CF6', glow: '#DDD6FE', cost: 150 },
  { id: 'emerald', label: 'Emerald', color: '#10B981', glow: '#A7F3D0', cost: 200 },
  { id: 'gold', label: 'Golden', color: '#F59E0B', glow: '#FDE68A', cost: 400 },
  { id: 'rose', label: 'Rose', color: '#F43F5E', glow: '#FECDD3', cost: 300 },
];

export const COSMETIC_ITEMS: CosmeticItem[] = [
  { id: 'none-hat', category: 'hat', label: 'No Hat', cost: 0 },
  { id: 'helmet', category: 'hat', label: 'Battle Helmet', cost: 200 },
  { id: 'partyHat', category: 'hat', label: 'Party Hat', cost: 120 },
  { id: 'crown', category: 'hat', label: 'Royal Crown', cost: 600 },

  { id: 'none-cape', category: 'cape', label: 'No Cape', cost: 0 },
  { id: 'heroCape', category: 'cape', label: 'Hero Cape', cost: 250 },
  { id: 'flameCape', category: 'cape', label: 'Flame Cape', cost: 450 },
  { id: 'shadowCape', category: 'cape', label: 'Shadow Cape', cost: 450 },

  { id: 'none-trail', category: 'trail', label: 'No Trail', cost: 0 },
  { id: 'sparkTrail', category: 'trail', label: 'Spark Trail', cost: 300 },
  { id: 'starTrail', category: 'trail', label: 'Star Trail', cost: 350 },

  { id: 'none-aura', category: 'aura', label: 'No Aura', cost: 0 },
  { id: 'goldAura', category: 'aura', label: 'Golden Aura', cost: 500 },
  { id: 'stormAura', category: 'aura', label: 'Storm Aura', cost: 500 },

  ...COLOR_THEMES.map((t): CosmeticItem => ({ id: t.id, category: 'colorTheme', label: t.label, cost: t.cost, color: t.color })),
];

export function cosmeticsByCategory(category: string): CosmeticItem[] {
  return COSMETIC_ITEMS.filter((c) => c.category === category);
}

export function colorThemeIndex(themeId: string): number {
  const idx = COLOR_THEMES.findIndex((t) => t.id === themeId);
  return idx >= 0 ? idx : 0;
}
