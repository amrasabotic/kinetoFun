/** Central type definitions for Gesture Hill Adventure. */

import type Matter from 'matter-js';

// ── Screens ───────────────────────────────────────────────────────────────────

export type Screen =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'game-over'
  | 'garage'
  | 'howtoplay'
  | 'settings'
  | 'statistics';

// ── Gestures ──────────────────────────────────────────────────────────────────

export type GestureType = 'neutral' | 'accelerate' | 'brake' | 'boost' | 'reverse';

export interface HandData {
  detected: boolean;
  landmarks: { x: number; y: number; z: number }[];
  palmY: number;       // normalised [0,1], 0=top of frame
  palmX: number;       // normalised [0,1], mirrored
  isFist: boolean;
  isOpen: boolean;
}

export interface GestureState {
  type: GestureType;
  throttle: number;    // -1 (full brake) → +1 (full accelerate)
  boostActive: boolean;
  boostCooldownMs: number;
}

// ── Vehicle ───────────────────────────────────────────────────────────────────

export interface Vehicle {
  chassis:          Matter.Body;
  frontWheel:       Matter.Body;
  rearWheel:        Matter.Body;
  frontSuspension:  Matter.Constraint;
  rearSuspension:   Matter.Constraint;
  frontAntiSway:    Matter.Constraint;
  rearAntiSway:     Matter.Constraint;
}

export interface VehicleSkin {
  id:           string;
  name:         string;
  emoji:        string;
  cost:         number;   // coins
  bodyColor:    string;
  cabinColor:   string;
  wheelColor:   string;
  rimColor:     string;
  accentColor:  string;
  exhaustColor: string;
  description:  string;
}

// ── Terrain ───────────────────────────────────────────────────────────────────

export interface TerrainPoint {
  x: number;
  y: number;
}

export interface TerrainChunk {
  startX:    number;
  endX:      number;
  points:    TerrainPoint[];   // surface points for rendering
  bodies:    Matter.Body[];    // physics rectangle segments
}

// ── Collectibles ──────────────────────────────────────────────────────────────

export interface Coin {
  id:        number;
  x:         number;
  y:         number;
  collected: boolean;
  spinAngle: number;   // for coin rotation animation
  bobOffset: number;   // phase offset for bob animation
}

export interface FuelCan {
  id:        number;
  x:         number;
  y:         number;
  collected: boolean;
  glow:      number;   // oscillates 0→1 for pulse effect
}

export interface Obstacle {
  id:   number;
  type: 'rock' | 'log';
  x:    number;
  y:    number;
  w:    number;
  h:    number;
  body: Matter.Body;
}

// ── Particles ─────────────────────────────────────────────────────────────────

export type ParticleType =
  | 'dust' | 'smoke' | 'spark' | 'flame'
  | 'dirt' | 'coinSparkle' | 'fuelGlow'
  | 'landingDirt' | 'boostFlame' | 'explosion'
  | 'ambient';

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;     // 0→1 (1=just born)
  maxLife: number;  // seconds
  color: string;
  size: number;
  type: ParticleType;
  gravity: number;  // multiplier for gravity
  alpha: number;
  rotation: number;
  rotSpeed: number;
  shrink: number;   // how fast to shrink
}

// ── Floating stunt text ───────────────────────────────────────────────────────

export interface FloatingText {
  id:     number;
  text:   string;
  x:      number;   // world x
  y:      number;   // world y
  color:  string;
  life:   number;   // 0→1 (1=just spawned)
  scale:  number;
  vy:     number;   // upward velocity
}

// ── Camera ────────────────────────────────────────────────────────────────────

export interface Camera {
  x:          number;
  y:          number;
  zoom:       number;
  targetX:    number;
  targetY:    number;
  targetZoom: number;
}

// ── Environments ──────────────────────────────────────────────────────────────

export interface Environment {
  name:           string;
  emoji:          string;
  skyTop:         string;   // gradient top
  skyBottom:      string;   // gradient bottom
  terrainFill:    string;
  terrainStroke:  string;
  terrainSurface: string;   // surface layer color
  cloudColor:     string;
  mountainColor:  string;
  treeColor:      string;
  treeTrunkColor: string;
  ambientColor:   string;   // ambient particle color
  fogColor:       string;
  accentColor:    string;   // coins / UI accents
  sunColor:       string;
  hasSnow:        boolean;
  hasLava:        boolean;
  hasCactus:      boolean;
  hasCandy:       boolean;
}

// ── Statistics ────────────────────────────────────────────────────────────────

export interface Statistics {
  bestDistance:    number;
  highestScore:    number;
  coinsCollected:  number;
  totalPlayTime:   number;   // seconds
  gamesPlayed:     number;
  flipsPerformed:  number;
  fuelPickups:     number;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface Settings {
  music:               boolean;
  sound:               boolean;
  gestureSensitivity:  number;   // 0.5–2.0, default 1.0
  graphicsQuality:     'low' | 'medium' | 'high';
}

// ── Save data ─────────────────────────────────────────────────────────────────

export interface SaveData {
  coins:         number;
  unlockedSkins: string[];
  selectedSkin:  string;
  highScore:     number;
  bestDistance:  number;
  statistics:    Statistics;
  settings:      Settings;
}

// ── Run-time game statistics (live HUD data) ──────────────────────────────────

export interface LiveStats {
  distance:     number;
  score:        number;
  coinCount:    number;
  fuel:         number;         // 0–100
  speed:        number;         // px/s
  combo:        number;
  airTime:      number;         // current air time seconds
  gesture:      GestureType;
  boostReady:   boolean;
  boostCooldownFrac: number;    // 0→1 (0=ready)
  environment:  string;
}

// ── Game-over result ──────────────────────────────────────────────────────────

export interface GameOverResult {
  score:          number;
  distance:       number;
  coins:          number;
  flips:          number;
  fuelPickups:    number;
  airTime:        number;
  highScore:      number;
  bestDistance:   number;
  isNewHighScore: boolean;
  isNewBestDist:  boolean;
}
