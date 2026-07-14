// Canvas-drawn arena themes. The engine cycles through these as waves progress.
export type ArenaStyle = 'trees' | 'castle' | 'dunes' | 'peaks' | 'lava' | 'huts';

export interface ArenaDef {
  id: string;
  name: string;
  emoji: string;
  style: ArenaStyle;
  sky: [string, string, string]; // top → mid → horizon
  ground: string;
  groundDark: string;
  silhouette: string;            // distant background shapes
  accent: string;                // platforms / props
  night: boolean;
}

export const ARENAS: ArenaDef[] = [
  {
    id: 'forest', name: 'Forest', emoji: '🌲', style: 'trees',
    sky: ['#1f3d52', '#3f7a86', '#cfe9c8'], ground: '#3a6b3a', groundDark: '#274d27',
    silhouette: '#1f4233', accent: '#6b4a2f', night: false,
  },
  {
    id: 'castle', name: 'Castle', emoji: '🏰', style: 'castle',
    sky: ['#2a2440', '#574a73', '#b6a6c9'], ground: '#4a4452', groundDark: '#332f3a',
    silhouette: '#3a3350', accent: '#6b6275', night: false,
  },
  {
    id: 'desert', name: 'Desert', emoji: '🏜️', style: 'dunes',
    sky: ['#3a3157', '#c97b4a', '#ffd9a0'], ground: '#c79a55', groundDark: '#9c7338',
    silhouette: '#a86b3c', accent: '#8a5a2f', night: false,
  },
  {
    id: 'mountain', name: 'Mountain', emoji: '🏔️', style: 'peaks',
    sky: ['#13243f', '#3a5f86', '#bcd6e8'], ground: '#5a6470', groundDark: '#3d454e',
    silhouette: '#2b3c52', accent: '#6f7a86', night: false,
  },
  {
    id: 'volcano', name: 'Volcano', emoji: '🌋', style: 'lava',
    sky: ['#1a0e12', '#5a1f1a', '#c9522a'], ground: '#3a2420', groundDark: '#241413',
    silhouette: '#2a1310', accent: '#7a3a22', night: true,
  },
  {
    id: 'village', name: 'Night Village', emoji: '🌙', style: 'huts',
    sky: ['#0a0f24', '#1b2347', '#3a4a78'], ground: '#1e2632', groundDark: '#141a24',
    silhouette: '#121a30', accent: '#3a4660', night: true,
  },
];

export function arenaForWave(wave: number): ArenaDef {
  // change arena every 3 waves
  return ARENAS[Math.floor((wave - 1) / 3) % ARENAS.length];
}
