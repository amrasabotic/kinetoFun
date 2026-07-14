export type GameState = 'menu' | 'story' | 'endless' | 'paused' | 'gameOver' | 'narrative' | 'levelMap';
export type GameMode = 'story' | 'endless';

export interface Projectile {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  type: 'apple' | 'star';
  radius: number;
  active: boolean;
  bounced: boolean;
}

export interface Shield {
  angle: number;
  arcLength: number;
  radius: number;
}

export interface Player {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
}

export interface Level {
  id: number;
  name: string;
  duration: number;
  spawnRate: number;
  starChance: number;
  speedMultiplier: number;
  narrative: NarrativeScene[];
  objective: string;
  scoreTarget: number;
  region: string;
}

export interface NarrativeScene {
  text: string;
  character?: string;
}

export interface GameStats {
  score: number;
  starsCollected: number;
  applesBlocked: number;
  level: number;
  highScore: number;
}

export interface HandPosition {
  x: number;
  y: number;
  angle: number;
  detected: boolean;
}
