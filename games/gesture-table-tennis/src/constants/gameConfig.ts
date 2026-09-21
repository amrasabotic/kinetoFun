import type {
  PaddleSkinId, BallSkinId, TrailId, ArenaId,
  AIDifficulty, AIPersonality, TournamentOpponent, ArcadeStage, GameSettings, SaveData, Statistics
} from '../types';

// ── Table dimensions (world units, roughly meters) ───────────────────────────
export const TABLE_HALF_W = 0.762;       // half width  (1.524m total)
export const TABLE_HALF_L = 1.37;        // half length (2.74m total)
export const TABLE_W = TABLE_HALF_W * 2;
export const TABLE_L = TABLE_HALF_L * 2;
export const NET_HEIGHT = 0.1525;
export const NET_Y = 0;                  // net at world y=0
export const NET_THICKNESS = 0.015;
export const BALL_RADIUS = 0.02;
export const GRAVITY = -9.8;
export const BOUNCE_RESTITUTION = 0.78;
export const AIR_DRAG = 0.015;

// ── Paddle dimensions ─────────────────────────────────────────────────────────
export const PADDLE_W = 0.16;
export const PADDLE_H = 0.17;
export const PADDLE_THICKNESS = 0.025;
export const PLAYER_PADDLE_Y_BASE = -TABLE_HALF_L + 0.05; // near player's end
export const AI_PADDLE_Y_BASE = TABLE_HALF_L - 0.05;       // near AI's end
export const PLAYER_PADDLE_Z = 0.15;    // default paddle height

// ── Physics tuning ────────────────────────────────────────────────────────────
export const SWING_POWER_FACTOR = 0.6;
export const SPIN_FACTOR = 3.0;
export const SPIN_FLIGHT_EFFECT = 0.8;
export const SPIN_BOUNCE_EFFECT = 1.2;
export const MIN_BALL_SPEED = 3.5;
export const MAX_BALL_SPEED = 18.0;
export const RALLY_SPEED_INCREMENT = 0.08;
export const POWER_SHOT_MULTIPLIER = 1.8;
export const POWER_SHOT_CHARGE_TIME = 1.0;
export const POWER_SHOT_COOLDOWN = 5.0;

// ── Gesture sensitivity ───────────────────────────────────────────────────────
export const HAND_X_SCALE = TABLE_HALF_W * 2.2;   // full hand sweep covers full table + margin
export const HAND_Z_MIN = 0.05;
export const HAND_Z_MAX = 0.55;
export const SWING_SPEED_SMASH = 4.5;
export const SWING_SPEED_POWER = 2.5;

// ── Scoring ───────────────────────────────────────────────────────────────────
export const POINTS_TO_WIN = 11;
export const WIN_BY = 2;
export const COMBO_MULTIPLIERS = [1, 1.5, 2, 3, 5, 8, 10];

// ── Cosmetics ─────────────────────────────────────────────────────────────────
export interface PaddleSkin { id: PaddleSkinId; name: string; cost: number; colors: [string, string]; emoji: string; }
export interface BallSkin { id: BallSkinId; name: string; cost: number; color: string; glowColor: string; emoji: string; }
export interface TrailSkin { id: TrailId; name: string; cost: number; colors: string[]; emoji: string; }

export const PADDLE_SKINS: PaddleSkin[] = [
  { id: 'wood',    name: 'Classic Wood',   cost: 0,    colors: ['#8B4513', '#A0522D'], emoji: '🪵' },
  { id: 'carbon',  name: 'Carbon Fiber',   cost: 200,  colors: ['#1a1a2e', '#16213e'], emoji: '⚫' },
  { id: 'crystal', name: 'Crystal Blue',   cost: 400,  colors: ['#00d4ff', '#0099cc'], emoji: '💎' },
  { id: 'neon',    name: 'Neon Strike',    cost: 500,  colors: ['#39ff14', '#00ff88'], emoji: '💚' },
  { id: 'galaxy',  name: 'Galaxy',         cost: 700,  colors: ['#7b2ff7', '#3d0099'], emoji: '🌌' },
  { id: 'fire',    name: 'Fire Blade',     cost: 600,  colors: ['#ff4500', '#ff8c00'], emoji: '🔥' },
  { id: 'ice',     name: 'Ice Storm',      cost: 600,  colors: ['#87ceeb', '#b0e2ff'], emoji: '🧊' },
  { id: 'robot',   name: 'Robo-Paddle',    cost: 800,  colors: ['#c0c0c0', '#808080'], emoji: '🤖' },
  { id: 'golden',  name: 'Golden Touch',   cost: 1000, colors: ['#ffd700', '#ffaa00'], emoji: '✨' },
  { id: 'retro',   name: 'Retro Wave',     cost: 300,  colors: ['#ff00ff', '#ff66ff'], emoji: '🕹️' },
];

export const BALL_SKINS: BallSkin[] = [
  { id: 'classic',  name: 'Classic',    cost: 0,   color: '#ffffff', glowColor: 'rgba(255,255,255,0.5)', emoji: '⚪' },
  { id: 'neon',     name: 'Neon',       cost: 250, color: '#00ffff', glowColor: 'rgba(0,255,255,0.6)',   emoji: '🔵' },
  { id: 'fireball', name: 'Fireball',   cost: 400, color: '#ff6600', glowColor: 'rgba(255,100,0,0.7)',   emoji: '🔴' },
  { id: 'rainbow',  name: 'Rainbow',    cost: 600, color: '#ff00ff', glowColor: 'rgba(255,0,255,0.6)',   emoji: '🌈' },
  { id: 'crystal',  name: 'Crystal',    cost: 500, color: '#aaffee', glowColor: 'rgba(170,255,238,0.6)', emoji: '💠' },
  { id: 'metallic', name: 'Metallic',   cost: 350, color: '#c0c0c0', glowColor: 'rgba(192,192,192,0.5)', emoji: '⚙️' },
];

export const TRAIL_SKINS: TrailSkin[] = [
  { id: 'none',      name: 'None',       cost: 0,    colors: [],                          emoji: '❌' },
  { id: 'lightning', name: 'Lightning',  cost: 300,  colors: ['#ffff00', '#ffffff'],       emoji: '⚡' },
  { id: 'stars',     name: 'Stars',      cost: 250,  colors: ['#ffff88', '#ffffff'],       emoji: '⭐' },
  { id: 'smoke',     name: 'Smoke',      cost: 200,  colors: ['#888888', '#444444'],       emoji: '💨' },
  { id: 'fire',      name: 'Fire',       cost: 350,  colors: ['#ff4400', '#ffaa00'],       emoji: '🔥' },
  { id: 'magic',     name: 'Magic',      cost: 450,  colors: ['#aa00ff', '#ff00aa'],       emoji: '✨' },
  { id: 'rainbow',   name: 'Rainbow',    cost: 500,  colors: ['#ff0000','#ff8800','#ffff00','#00ff00','#0088ff','#8800ff'], emoji: '🌈' },
];

// ── Arena definitions ─────────────────────────────────────────────────────────
export interface ArenaDef {
  id: ArenaId;
  name: string;
  tableColor: string;
  tableLineColor: string;
  floorColor: string;
  bgGradient: [string, string];
  accentColor: string;
  emoji: string;
}

export const ARENAS: ArenaDef[] = [
  { id: 'sportsHall', name: 'Sports Hall',     tableColor: '#1a4a1a', tableLineColor: '#ffffff', floorColor: '#8B7355', bgGradient: ['#1a1a2e','#16213e'], accentColor: '#4ade80', emoji: '🏟️' },
  { id: 'beach',      name: 'Beach Court',     tableColor: '#1a5c3a', tableLineColor: '#ffffffaa', floorColor: '#c2a46e', bgGradient: ['#0ea5e9','#0284c7'], accentColor: '#fbbf24', emoji: '🏖️' },
  { id: 'rooftop',    name: 'Rooftop Arena',   tableColor: '#2a2a3e', tableLineColor: '#00ffff88', floorColor: '#374151', bgGradient: ['#0f0f23','#1a0a2e'], accentColor: '#22d3ee', emoji: '🏙️' },
  { id: 'cyber',      name: 'Cyber Arena',     tableColor: '#001a33', tableLineColor: '#00ffff', floorColor: '#0a0a1a', bgGradient: ['#000011','#001133'], accentColor: '#00ffff', emoji: '🤖' },
  { id: 'forest',     name: 'Forest Pavilion', tableColor: '#1a3d1a', tableLineColor: '#aaff88', floorColor: '#2d5a1b', bgGradient: ['#0a1f0a','#143d14'], accentColor: '#86efac', emoji: '🌳' },
  { id: 'space',      name: 'Space Station',   tableColor: '#1a1a3e', tableLineColor: '#8888ff', floorColor: '#0a0a1a', bgGradient: ['#000008','#050012'], accentColor: '#818cf8', emoji: '🚀' },
  { id: 'neon',       name: 'Neon Stadium',    tableColor: '#1a003a', tableLineColor: '#ff00ff', floorColor: '#120024', bgGradient: ['#0a0018','#1a0028'], accentColor: '#f0abfc', emoji: '🌟' },
  { id: 'temple',     name: 'Temple Arena',    tableColor: '#2a1a08', tableLineColor: '#ffd700', floorColor: '#3d2409', bgGradient: ['#1a0a00','#2a1400'], accentColor: '#fbbf24', emoji: '🏯' },
];

// ── AI opponents ──────────────────────────────────────────────────────────────
export interface AIProfile {
  name: string;
  personality: AIPersonality;
  difficulty: AIDifficulty;
  reactionTime: number;     // seconds before AI starts tracking ball
  maxSpeed: number;         // max paddle speed (world units/sec)
  spinFactor: number;       // how much spin AI applies
  smashThreshold: number;   // swing speed threshold for smash
  errorRate: number;        // 0-1, how often AI makes mistakes
  predictionDepth: number;  // how far ahead AI predicts (frames)
}

export const AI_PROFILES: Record<AIPersonality, AIProfile> = {
  beginner:   { name: 'Beginner Bot',  personality: 'beginner',   difficulty: 'easy',   reactionTime: 0.6, maxSpeed: 2.0, spinFactor: 0.2, smashThreshold: 99, errorRate: 0.35, predictionDepth: 10 },
  balanced:   { name: 'Balanced',      personality: 'balanced',   difficulty: 'medium', reactionTime: 0.3, maxSpeed: 3.5, spinFactor: 0.6, smashThreshold: 4.0, errorRate: 0.15, predictionDepth: 20 },
  defender:   { name: 'The Defender',  personality: 'defender',   difficulty: 'medium', reactionTime: 0.2, maxSpeed: 4.0, spinFactor: 0.3, smashThreshold: 99, errorRate: 0.05, predictionDepth: 30 },
  attacker:   { name: 'The Attacker',  personality: 'attacker',   difficulty: 'hard',   reactionTime: 0.25, maxSpeed: 5.0, spinFactor: 0.7, smashThreshold: 2.5, errorRate: 0.2, predictionDepth: 25 },
  spinMaster: { name: 'Spin Master',   personality: 'spinMaster', difficulty: 'hard',   reactionTime: 0.2, maxSpeed: 4.5, spinFactor: 1.5, smashThreshold: 3.5, errorRate: 0.1, predictionDepth: 30 },
  champion:   { name: 'Champion',      personality: 'champion',   difficulty: 'expert', reactionTime: 0.1, maxSpeed: 6.5, spinFactor: 1.2, smashThreshold: 2.0, errorRate: 0.02, predictionDepth: 60 },
};

export const DIFFICULTY_AI_MAP: Record<AIDifficulty, AIPersonality> = {
  easy: 'beginner', medium: 'balanced', hard: 'attacker', expert: 'champion',
};

// ── Tournament opponents ──────────────────────────────────────────────────────
export const TOURNAMENT_OPPONENTS: TournamentOpponent[] = [
  { id: 'alex',    name: 'Alex',    personality: 'beginner',   difficulty: 'easy',   avatar: '😊', description: 'Just getting started',                    defeated: false, reward: { type: 'coins', amount: 100 } },
  { id: 'sam',     name: 'Sam',     personality: 'balanced',   difficulty: 'medium', avatar: '😎', description: 'A well-rounded player',                   defeated: false, reward: { type: 'coins', amount: 200 } },
  { id: 'blake',   name: 'Blake',   personality: 'defender',   difficulty: 'medium', avatar: '🛡️', description: 'Never misses a return',                    defeated: false, reward: { type: 'coins', amount: 200 } },
  { id: 'riley',   name: 'Riley',   personality: 'attacker',   difficulty: 'hard',   avatar: '⚡', description: 'Smashes everything',                      defeated: false, reward: { type: 'paddle', id: 'carbon' } },
  { id: 'jordan',  name: 'Jordan',  personality: 'spinMaster', difficulty: 'hard',   avatar: '🌀', description: 'Heavy spin is their weapon',               defeated: false, reward: { type: 'ball', id: 'neon' } },
  { id: 'casey',   name: 'Casey',   personality: 'champion',   difficulty: 'expert', avatar: '👑', description: 'The reigning champion. Reads your moves.',  defeated: false, reward: { type: 'paddle', id: 'golden' } },
];

// ── Arcade stages ─────────────────────────────────────────────────────────────
export const ARCADE_STAGES: ArcadeStage[] = [
  { number: 1,  name: 'Warm Up',       description: 'Standard play',                  mods: [],                     targetScore: 3,  reward: { type: 'coins', amount: 50 } },
  { number: 2,  name: 'Speed Up',      description: 'Ball is faster',                 mods: ['fastBall'],           targetScore: 5,  reward: { type: 'coins', amount: 75 } },
  { number: 3,  name: 'Spin Zone',     description: 'Heavy spin on every shot',        mods: ['moreSpin'],           targetScore: 5,  reward: { type: 'coins', amount: 75 } },
  { number: 4,  name: 'Tiny Blade',    description: 'Smaller paddle',                  mods: ['smallPaddle'],        targetScore: 5,  reward: { type: 'coins', amount: 100 } },
  { number: 5,  name: 'Moving Floor',  description: 'Table shifts side to side',       mods: ['movingTable'],        targetScore: 5,  reward: { type: 'coins', amount: 100 } },
  { number: 6,  name: 'Wind',          description: 'Wind pushes the ball sideways',   mods: ['fastBall','wind'],    targetScore: 7,  reward: { type: 'coins', amount: 150 } },
  { number: 7,  name: 'Chaos',         description: 'Random bounce zones!',            mods: ['randomBounce'],       targetScore: 7,  reward: { type: 'coins', amount: 150 } },
  { number: 8,  name: 'Speed Demon',   description: 'Extremely fast ball + spin',      mods: ['fastBall','moreSpin'], targetScore: 9,  reward: { type: 'coins', amount: 200 } },
  { number: 9,  name: 'The Gauntlet',  description: 'Everything at once',              mods: ['fastBall','moreSpin','smallPaddle','wind'], targetScore: 11, reward: { type: 'coins', amount: 300 } },
  { number: 10, name: 'Grand Finale',  description: 'Maximum chaos — can you survive?', mods: ['fastBall','moreSpin','smallPaddle','movingTable','wind','randomBounce'], targetScore: 11, reward: { type: 'coins', amount: 500 } },
];

// ── Default save/settings ─────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  gestureSensitivity: 1.0,
  handSmoothing: 0.7,
  graphicsQuality: 'high',
  handedness: 'right',
  defaultDifficulty: 'medium',
  defaultArena: 'sportsHall',
};

export const DEFAULT_STATISTICS: Statistics = {
  matchesPlayed: 0, matchesWon: 0, longestRally: 0,
  highestCombo: 0, perfectHits: 0, smashCount: 0,
  powerShotsUsed: 0, coinsEarned: 0, tournamentWins: 0,
  hoursPlayed: 0, totalReturns: 0, highScores: {},
};

export function defaultSave(): SaveData {
  return {
    coins: 0,
    statistics: { ...DEFAULT_STATISTICS },
    settings: { ...DEFAULT_SETTINGS },
    selectedPaddle: 'wood', selectedBall: 'classic', selectedTrail: 'none',
    unlockedPaddles: ['wood'], unlockedBalls: ['classic'], unlockedTrails: ['none'],
    arcadeHighestStage: 0,
    tournamentWins: 0,
  };
}
