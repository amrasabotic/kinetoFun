// ── Core primitives ──────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

// ── Snake ────────────────────────────────────────────────────────────────────

export interface Segment {
  x: number;
  y: number;
}

export type SnakeSkinId =
  | 'default' | 'fire' | 'ice' | 'neon' | 'rainbow'
  | 'jungle' | 'galaxy' | 'robot' | 'candy' | 'crystal' | 'shadow';

export type HeadAccessoryId =
  | 'none' | 'crown' | 'helmet' | 'wizard' | 'pirate' | 'sunglasses' | 'headphones';

export type TrailId =
  | 'none' | 'stars' | 'fire' | 'rainbow' | 'lightning' | 'leaves' | 'snow';

export interface SnakeSkin {
  id: SnakeSkinId;
  name: string;
  cost: number;
  colors: string[];      // [head, body1, body2]
  unlocked: boolean;
}

export interface HeadAccessory {
  id: HeadAccessoryId;
  name: string;
  cost: number;
  unlocked: boolean;
}

export interface Trail {
  id: TrailId;
  name: string;
  cost: number;
  unlocked: boolean;
}

// ── Collectibles ─────────────────────────────────────────────────────────────

export type OrbColor = 'blue' | 'green' | 'purple' | 'gold' | 'rainbow';

export interface EnergyOrb {
  id: number;
  x: number;
  y: number;
  radius: number;
  value: number;
  color: OrbColor;
  phase: number;        // animation phase
  bobOffset: number;
}

export type PowerUpType =
  | 'shield' | 'magnet' | 'double_score' | 'ghost'
  | 'freeze' | 'giant_energy';

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
  phase: number;
  lifetime: number;     // ms remaining before despawn
}

export interface ActivePowerUp {
  type: PowerUpType;
  remaining: number;    // ms remaining
  total: number;
}

// ── AI ───────────────────────────────────────────────────────────────────────

export type AIBehavior = 'collector' | 'hunter' | 'defender' | 'opportunist' | 'wanderer';

export interface AISnakeState {
  id: number;
  name: string;
  segments: Segment[];
  angle: number;
  speed: number;
  targetAngle: number;
  boosting: boolean;
  boostCooldown: number;
  skinColors: string[];
  score: number;
  behavior: AIBehavior;
  behaviorTimer: number;
  targetX: number;
  targetY: number;
  alive: boolean;
  length: number;       // segment count
  deathParticlesSent: boolean;
  wanderAngle: number;
  wanderTimer: number;
}

// ── Player ───────────────────────────────────────────────────────────────────

export interface PlayerSnakeState {
  segments: Segment[];
  angle: number;
  speed: number;
  targetAngle: number;
  boosting: boolean;
  boostCooldown: number;
  alive: boolean;
  blinkTimer: number;
  blinkOpen: boolean;
  mouthOpen: number;    // 0-1
  wavePhase: number;
  score: number;
  length: number;
  combo: number;
  comboTimer: number;
  shieldActive: boolean;
  ghostActive: boolean;
  magnetActive: boolean;
  activePowerUps: ActivePowerUp[];
  boostsUsed: number;
}

// ── Particles ────────────────────────────────────────────────────────────────

export type ParticleType =
  | 'sparkle' | 'boost' | 'explosion' | 'combo'
  | 'pickup' | 'shield' | 'dust' | 'firefly' | 'magic';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0-1 (1=new, 0=dead)
  decay: number;      // life subtracted per frame
  size: number;
  color: string;
  alpha: number;
  type: ParticleType;
  rotation: number;
  rotSpeed: number;
}

// ── Camera ───────────────────────────────────────────────────────────────────

export interface CameraState {
  x: number;          // world position of camera center
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

// ── Quests ───────────────────────────────────────────────────────────────────

export type QuestType =
  | 'collect_energy' | 'defeat_snakes' | 'reach_length'
  | 'survive_time' | 'collect_powerups' | 'use_boost';

export interface Quest {
  id: string;
  type: QuestType;
  description: string;
  target: number;
  current: number;
  reward: number;     // coins
  completed: boolean;
}

// ── Floating text ────────────────────────────────────────────────────────────

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  life: number;
}

// ── Environment / Arena ──────────────────────────────────────────────────────

export type EnvironmentId =
  | 'forest' | 'desert' | 'ice' | 'volcano' | 'candy'
  | 'space' | 'ocean' | 'cyber';

export interface Environment {
  id: EnvironmentId;
  name: string;
  bgColors: string[];         // gradient stops
  groundColor: string;
  accentColor: string;
  particleColor: string;
  decorationColors: string[];
}

// ── Leaderboard entry ────────────────────────────────────────────────────────

export interface LeaderEntry {
  name: string;
  score: number;
  length: number;
  isPlayer: boolean;
  alive: boolean;
  rank: number;
}

// ── Statistics ───────────────────────────────────────────────────────────────

export interface Statistics {
  highScore: number;
  longestSnake: number;
  gamesPlayed: number;
  totalSurvivalTime: number;    // ms
  totalEnergyCollected: number;
  aiSnakesDefeated: number;
  powerUpsCollected: number;
  boostsUsed: number;
  comboRecord: number;
  coinsEarned: number;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface GameSettings {
  musicVolume: number;    // 0-1
  soundVolume: number;    // 0-1
  gestureSensitivity: number; // 0.5-2.0
  graphicsQuality: 'low' | 'medium' | 'high';
  selfCollision: boolean;
  showMinimap: boolean;
  showFPS: boolean;
}

// ── Save data ────────────────────────────────────────────────────────────────

export interface SaveData {
  coins: number;
  selectedSkin: SnakeSkinId;
  selectedAccessory: HeadAccessoryId;
  selectedTrail: TrailId;
  unlockedSkins: SnakeSkinId[];
  unlockedAccessories: HeadAccessoryId[];
  unlockedTrails: TrailId[];
  statistics: Statistics;
  settings: GameSettings;
  highScores: number[];
}

// ── Game state ───────────────────────────────────────────────────────────────

export type GameScreen =
  | 'menu' | 'playing' | 'game-over' | 'skins' | 'statistics'
  | 'settings' | 'howtoplay' | 'credits';
