import type { ColorId } from '../types';

export interface ColorDef { id: ColorId; hex: string; label: string }

export const COLORS: ColorDef[] = [
  { id: 'red', hex: '#E4362E', label: 'Red' },
  { id: 'blue', hex: '#2A5CD6', label: 'Blue' },
  { id: 'green', hex: '#2FA35A', label: 'Green' },
  { id: 'yellow', hex: '#F4C430', label: 'Yellow' },
  { id: 'orange', hex: '#F07A26', label: 'Orange' },
  { id: 'purple', hex: '#9B4FD6', label: 'Purple' },
];

const BY_ID: Record<ColorId, ColorDef> = Object.fromEntries(COLORS.map((c) => [c.id, c])) as Record<ColorId, ColorDef>;

export function colorHex(id: ColorId): string {
  return BY_ID[id]?.hex ?? '#999999';
}

export function colorLabel(id: ColorId): string {
  return BY_ID[id]?.label ?? id;
}

export function randomColor(exclude?: ColorId[]): ColorId {
  const filtered = COLORS.filter((c) => !exclude?.includes(c.id));
  const pool = filtered.length > 0 ? filtered : COLORS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

/** Colorblind-safe pattern glyphs, one per color, shown as a small overlay label when the setting is on. */
export const COLOR_LABEL_GLYPH: Record<ColorId, string> = {
  red: '●', blue: '▲', green: '■', yellow: '◆', orange: '▼', purple: '★',
};
