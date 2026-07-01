import type { ColorId, PaletteColor } from '../types';

export const PALETTE: PaletteColor[] = [
  { id: 'red', hex: '#E4362E', label: 'Red' },
  { id: 'blue', hex: '#2A5CD6', label: 'Blue' },
  { id: 'green', hex: '#2FA35A', label: 'Green' },
  { id: 'yellow', hex: '#F4C430', label: 'Yellow' },
  { id: 'black', hex: '#1B1B1F', label: 'Black' },
  { id: 'white', hex: '#F5F5F5', label: 'White' },
  { id: 'orange', hex: '#F07A26', label: 'Orange' },
  { id: 'brown', hex: '#8A5A34', label: 'Brown' },
];

const BY_ID: Record<ColorId, PaletteColor> = Object.fromEntries(
  PALETTE.map((c) => [c.id, c]),
) as Record<ColorId, PaletteColor>;

export function colorHex(id: ColorId): string {
  return BY_ID[id]?.hex ?? '#999999';
}

export function colorLabel(id: ColorId): string {
  return BY_ID[id]?.label ?? id;
}

/** Colorblind-safe pattern hints (rendered as subtle overlay glyphs), one per color. */
export const COLOR_PATTERNS: Record<ColorId, string> = {
  red: '●●',
  blue: '▲▲',
  green: '■■',
  yellow: '◆◆',
  black: '★★',
  white: '○○',
  orange: '▼▼',
  brown: '✦✦',
};
