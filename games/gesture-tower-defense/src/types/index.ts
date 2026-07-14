export interface HandFrame {
  detected: boolean;
  confidence: number;
  cursorX: number;
  cursorY: number;
  isPinching: boolean;
}

export interface GestureSettings {
  musicVolume: number;
  sfxVolume: number;
  mirrorCamera: boolean;
  gestureSensitivity: number; // 0..1, widens the pinch trigger distance
}

export type TowerTypeId = 'blaster' | 'cannon' | 'frost';

export interface TowerDef {
  id: TowerTypeId;
  name: string;
  cost: number;
  damage: number;
  range: number; // fraction of battlefield diagonal
  fireRateMs: number;
  projectileSpeed: number; // fraction of battlefield diagonal per second
  splashRadius: number; // 0 = single-target
  slowFactor: number; // 0 = no slow; else multiplies enemy speed while affected
  slowDurationMs: number; // how long the slow lingers after a hit
  color: string;
}

export interface PlacedTower {
  id: string;
  slotIndex: number;
  typeId: TowerTypeId;
  cooldownMs: number; // time remaining until it can fire again
}

export interface EnemyDef {
  id: string;
  hp: number;
  speed: number; // fraction of path length per second
  reward: number;
  damageToBase: number;
  color: string;
  radius: number;
}

export interface Enemy {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  progress: number; // 0..1 along the path
  slowUntilMs: number; // simulation-time timestamp; while simTime < this, speed is multiplied by speedFactor
  speedFactor: number; // 1 = normal; set by a frost hit, ignored once simTime passes slowUntilMs
}

export interface Projectile {
  id: string;
  fromX: number;
  fromY: number;
  targetEnemyId: string;
  x: number;
  y: number;
  speed: number;
  damage: number;
  splashRadius: number;
  slowFactor: number;
  slowDurationMs: number;
  color: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapDef {
  id: string;
  name: string;
  path: Point[]; // waypoints, normalized 0..1, enemies walk this polyline start to end
  buildSlots: Point[]; // normalized 0..1 positions where towers may be placed
}

export interface WaveSpawn {
  defId: string;
  delayMs: number; // time after wave start to spawn this enemy
}

export interface WaveDef {
  index: number;
  spawns: WaveSpawn[];
}

export interface BattleState {
  mapId: string;
  waveIndex: number; // 0-based, current or most-recently-started wave
  totalWaves: number;
  currency: number;
  baseHealth: number;
  maxBaseHealth: number;
  towers: PlacedTower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  pendingSpawns: { defId: string; atMs: number }[]; // remaining spawns for the active wave, atMs = simTime to spawn
  simTimeMs: number;
  waveActive: boolean;
  won: boolean;
  lost: boolean;
}

export type GameMode = 'campaign' | 'endless' | 'daily';
