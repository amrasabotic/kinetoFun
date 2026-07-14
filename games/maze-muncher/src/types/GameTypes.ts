// ── Shared primitives ──────────────────────────────────────────────────────

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Vec2 {
  x: number;
  y: number;
}

export interface GridPos {
  col: number;
  row: number;
}

// ── Maze ────────────────────────────────────────────────────────────────────

/** Bitmask-free per-cell wall record. `true` = wall present on that side. */
export interface CellWalls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type CollectibleKind = 'orb' | 'power' | 'gem' | 'treasure';

export interface Collectible {
  id: number;
  kind: CollectibleKind;
  col: number;
  row: number;
  collected: boolean;
  /** Gems/treasure despawn after a timer; undefined = never despawns. */
  expiresAt?: number;
}

export interface MazeTheme {
  name: string;
  pathColor: string;
  glowColor: string;
  bgTop: string;
  bgBottom: string;
  accent: string;
}

export interface Maze {
  cols: number;
  rows: number;
  cells: CellWalls[][];
  /** Cells with 3+ open sides — the only places a turn may be committed. */
  intersections: GridPos[];
  playerSpawn: GridPos;
  enemyHome: GridPos;
  /** Row index that wraps left <-> right (classic warp tunnel), or -1. */
  warpRow: number;
  collectibles: Collectible[];
  theme: MazeTheme;
  seedLabel: string;
}

// ── Enemies ─────────────────────────────────────────────────────────────────

export type EnemyKind = 'chaser' | 'ambusher' | 'patroller' | 'hunter';

export type EnemyMode = 'normal' | 'frightened' | 'eaten';

export interface Enemy {
  id: number;
  kind: EnemyKind;
  col: number;
  row: number;
  dir: Direction;
  desiredDir: Direction | null;
  mode: EnemyMode;
  speed: number; // tiles per second
  patrolIndex: number;
  color: string;
}

// ── Player ──────────────────────────────────────────────────────────────────

export interface Player {
  col: number;
  row: number;
  dir: Direction;
  desiredDir: Direction | null;
  speed: number;
  lives: number;
  invulnerableUntil: number;
  mouthPhase: number;
}

// ── Score / progression ─────────────────────────────────────────────────────

export interface ScoreState {
  score: number;
  streak: number;
  comboMultiplier: 1 | 2 | 3 | 5;
  chainKillCount: number;
  level: number;
  highScore: number;
}

export interface PowerModeState {
  active: boolean;
  endsAt: number;
  duration: number;
}

// ── Settings / persistence ──────────────────────────────────────────────────

export interface Settings {
  sensitivity: number; // 0.5 - 2
  smoothing: number; // 0 - 1
  deadzone: number; // 0 - 0.3
  sound: boolean;
  musicVolume: number;
  sfxVolume: number;
  highContrast: boolean;
  colorblindMode: boolean;
  largeUI: boolean;
  leftHanded: boolean;
  showFps: boolean;
  aimAssist: boolean;
}

export interface SaveData {
  settings: Settings;
  highScores: { score: number; level: number; date: string }[];
  lastCalibration: Vec2 | null;
}

// ── App-level screen state machine ──────────────────────────────────────────

export type Screen =
  | 'menu'
  | 'howtoplay'
  | 'settings'
  | 'highscores'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'levelcomplete'
  | 'gameover';

export interface HudSnapshot {
  score: number;
  lives: number;
  level: number;
  comboMultiplier: number;
  powerActive: boolean;
  powerRemainingMs: number;
  powerDuration: number;
  orbsRemaining: number;
  orbsTotal: number;
  fps: number;
  handDetected: boolean;
  highScore: number;
  paused: boolean;
}
