export interface ColorDef {
  name: string;
  hex: string;
  glow: string; // brighter highlight variant, used for glass reflections/glow
}

/**
 * A curated, fixed palette rather than runtime-random color generation —
 * every entry was hand-picked for maximum hue/lightness separation from
 * every other entry, which a random generator can't reliably guarantee
 * ("never generate nearly identical colors" is much safer as a fixed list
 * than a runtime constraint solver). Also doubles as the colorblind-mode
 * shape key below, one plain Unicode glyph per color — deliberately using
 * only basic geometric symbols (bullets/shapes), never emoji, after this
 * catalog already hit an unsupported-glyph rendering bug once (Zoo
 * Architect, ADR-047).
 */
export const COLOR_PALETTE: ColorDef[] = [
  { name: 'Red', hex: '#e53935', glow: '#ff8a80' },
  { name: 'Blue', hex: '#1e88e5', glow: '#82b1ff' },
  { name: 'Green', hex: '#43a047', glow: '#a5d6a7' },
  { name: 'Yellow', hex: '#fdd835', glow: '#fff59d' },
  { name: 'Purple', hex: '#8e24aa', glow: '#ce93d8' },
  { name: 'Orange', hex: '#fb8c00', glow: '#ffcc80' },
  { name: 'Pink', hex: '#ec407a', glow: '#f8bbd0' },
  { name: 'Teal', hex: '#00897b', glow: '#80cbc4' },
  { name: 'Cyan', hex: '#00acc1', glow: '#80deea' },
  { name: 'Brown', hex: '#6d4c41', glow: '#bcaaa4' },
  { name: 'White', hex: '#f5f5f5', glow: '#ffffff' },
  { name: 'Black', hex: '#263238', glow: '#78909c' },
  { name: 'Gold', hex: '#ffb300', glow: '#ffe082' },
  { name: 'Lime', hex: '#c0ca33', glow: '#e6ee9c' },
  { name: 'Turquoise', hex: '#00bfa5', glow: '#a7ffeb' },
];

/** One glyph per palette index — plain geometric symbols only, never emoji. */
export const COLORBLIND_SYMBOLS = ['●', '■', '▲', '★', '◆', '✚', '✕', '▼', '○', '□', '△', '▽', '☆', '◇', '✦'];

export function colorDef(colorId: number): ColorDef {
  return COLOR_PALETTE[colorId % COLOR_PALETTE.length];
}

export function colorSymbol(colorId: number): string {
  return COLORBLIND_SYMBOLS[colorId % COLORBLIND_SYMBOLS.length];
}
