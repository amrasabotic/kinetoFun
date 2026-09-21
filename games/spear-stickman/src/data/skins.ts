// Cosmetic spear skins. The first is free; the rest cost coins (saved locally).
export interface SkinDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  shaft: string;   // wood / metal shaft colour
  tip: string;     // spearhead colour
  trail: string;   // flight trail colour
  glow?: boolean;
}

export const SKINS: SkinDef[] = [
  { id: 'wood',      name: 'Wood Spear',      emoji: '🪵', cost: 0,    shaft: '#a9763f', tip: '#d7d2c4', trail: 'rgba(215,210,196,0.5)' },
  { id: 'steel',     name: 'Steel Spear',     emoji: '⚔️', cost: 60,   shaft: '#7c8794', tip: '#e8eef5', trail: 'rgba(232,238,245,0.55)' },
  { id: 'gold',      name: 'Golden Spear',    emoji: '🥇', cost: 150,  shaft: '#caa12e', tip: '#ffe17a', trail: 'rgba(255,225,122,0.6)', glow: true },
  { id: 'crystal',   name: 'Crystal Spear',   emoji: '💎', cost: 260,  shaft: '#5fd2e6', tip: '#d6fbff', trail: 'rgba(150,235,250,0.6)', glow: true },
  { id: 'fire',      name: 'Fire Spear',      emoji: '🔥', cost: 380,  shaft: '#e0561d', tip: '#ffd34d', trail: 'rgba(255,140,40,0.65)', glow: true },
  { id: 'ice',       name: 'Ice Spear',       emoji: '❄️', cost: 380,  shaft: '#7fb6e8', tip: '#e8f8ff', trail: 'rgba(150,210,255,0.65)', glow: true },
  { id: 'lightning', name: 'Lightning Spear', emoji: '⚡', cost: 520,  shaft: '#c9b6ff', tip: '#fff7a8', trail: 'rgba(190,170,255,0.7)', glow: true },
  { id: 'dragon',    name: 'Dragon Spear',    emoji: '🐉', cost: 700,  shaft: '#2f7d4f', tip: '#b6ff8c', trail: 'rgba(120,230,140,0.7)', glow: true },
  { id: 'shadow',    name: 'Shadow Spear',    emoji: '🌑', cost: 700,  shaft: '#4a4660', tip: '#b3a7ff', trail: 'rgba(120,110,170,0.7)', glow: true },
  { id: 'rainbow',   name: 'Rainbow Spear',   emoji: '🌈', cost: 999,  shaft: '#ff6ec7', tip: '#fff3a8', trail: 'rgba(255,150,220,0.7)', glow: true },
];

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
