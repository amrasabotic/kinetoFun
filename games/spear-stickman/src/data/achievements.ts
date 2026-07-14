// Achievements checked against cumulative + best stats stored locally.
export interface AchStat {
  totalKills: number;
  totalHeadshots: number;
  bestWave: number;
  bestCombo: number;
  bossKills: number;
  perfectWaves: number;
}

export interface AchDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  check: (s: AchStat) => boolean;
}

export const ACHIEVEMENTS: AchDef[] = [
  { id: 'first-blood', name: 'First Blood',      emoji: '🩸', desc: 'Defeat your first enemy',        check: (s) => s.totalKills >= 1 },
  { id: 'hundred',     name: 'Centurion',        emoji: '💯', desc: 'Defeat 100 enemies',             check: (s) => s.totalKills >= 100 },
  { id: 'five-hundred',name: 'Spearmaster',      emoji: '🔱', desc: 'Defeat 500 enemies',             check: (s) => s.totalKills >= 500 },
  { id: 'thousand',    name: 'Legendary Slayer', emoji: '🏆', desc: 'Defeat 1000 enemies',            check: (s) => s.totalKills >= 1000 },
  { id: 'head-10',     name: 'Sharp Eye',        emoji: '👁️', desc: 'Land 10 headshots',              check: (s) => s.totalHeadshots >= 10 },
  { id: 'head-100',    name: 'Headhunter',       emoji: '🎯', desc: 'Land 100 headshots',             check: (s) => s.totalHeadshots >= 100 },
  { id: 'perfect',     name: 'Untouchable',      emoji: '✨', desc: 'Clear a wave taking no damage',  check: (s) => s.perfectWaves >= 1 },
  { id: 'boss',        name: 'Boss Slayer',      emoji: '👹', desc: 'Defeat a giant boss',            check: (s) => s.bossKills >= 1 },
  { id: 'combo',       name: 'Combo Master',     emoji: '🔥', desc: 'Reach a ×10 combo',              check: (s) => s.bestCombo >= 10 },
  { id: 'wave-10',     name: 'Wave 10',          emoji: '🌊', desc: 'Survive to wave 10',             check: (s) => s.bestWave >= 10 },
  { id: 'wave-25',     name: 'Wave 25',          emoji: '🌪️', desc: 'Survive to wave 25',             check: (s) => s.bestWave >= 25 },
  { id: 'wave-50',     name: 'Survivor',         emoji: '🛡️', desc: 'Survive to wave 50',             check: (s) => s.bestWave >= 50 },
];
