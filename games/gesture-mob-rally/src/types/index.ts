// ── Core shared types for Mob Rally ─────────────────────────────────────────

export type Team = 'player' | 'enemy';
export type UnitState = 'run' | 'hit' | 'die' | 'celebrate' | 'fight';

export interface StickFigureUnit {
  id: number;
  active: boolean;
  team: Team;
  laneX: number;
  depthZ: number;
  height: number;
  vx: number;
  vz: number;
  hp: number;
  state: UnitState;
  stateTimer: number;
  animPhase: number;
  colorIndex: number;
  hatId: string | null;
  capeId: string | null;
  auraId: string | null;
  formationSlotX: number;
  formationSlotZ: number;
}

// ── Gates ─────────────────────────────────────────────────────────────────

export type GateOp = 'add' | 'multiply';

export interface GateDef {
  id: string;
  label: string;
  op: GateOp;
  value: number;
  color: string;
  minTier: number;
  weight: number;
}

export interface GatePlacement {
  laneX: number;
  gateDefId: string;
  z: number;
  resolved: boolean;
}

// ── Obstacles ─────────────────────────────────────────────────────────────

export type ObstacleKind =
  | 'hammer' | 'axe' | 'wall' | 'barrel' | 'spike' | 'laser' | 'crusher' | 'saw';

export interface ObstacleDef {
  id: string;
  kind: ObstacleKind;
  label: string;
  crowdDamage: number;
  chargeModeDestructible: boolean;
  laneSpan: number;
  animSpeedMs: number;
  minTier: number;
  weight: number;
}

export interface ObstaclePlacement {
  id: number;
  obstacleDefId: string;
  laneX: number;
  z: number;
  hit: boolean;
  animPhase: number;
  destroyed: boolean;
}

// ── Enemy crowds ─────────────────────────────────────────────────────────

export type EnemyArchetype = 'basic' | 'shielded' | 'fast';

export interface EnemyCrowdSpec {
  id: number;
  count: number;
  archetype: EnemyArchetype;
  z: number;
  laneX: number;
  resolved: boolean;
}

// ── Bosses ────────────────────────────────────────────────────────────────

export type BossAttackKind = 'melee' | 'aoe' | 'charge' | 'summon';

export interface BossAttackPattern {
  id: string;
  kind: BossAttackKind;
  telegraphMs: number;
  durationMs: number;
  damage: number;
  addWaveCount?: number;
}

export interface BossPhase {
  hpThresholdPct: number;
  attackIds: string[];
}

export interface BossDef {
  id: string;
  name: string;
  baseHp: number;
  color: string;
  accentColor: string;
  phases: BossPhase[];
  attackPatterns: BossAttackPattern[];
  minLevelIndex: number;
}

export interface BossRuntimeState {
  bossDefId: string;
  hp: number;
  maxHp: number;
  phaseIndex: number;
  currentAttack: BossAttackPattern | null;
  attackTimer: number;
  telegraphing: boolean;
  laneX: number;
  z: number;
  defeated: boolean;
  hitFlash: number;
}

// ── Castle ────────────────────────────────────────────────────────────────

export interface CastleRuntimeState {
  hp: number;
  maxHp: number;
  z: number;
  collapsed: boolean;
  collapseTimer: number;
}

// ── Power-ups ─────────────────────────────────────────────────────────────

export type PowerUpKind =
  | 'shield' | 'speed' | 'magnet' | 'freeze' | 'megaCrowd' | 'doubleCoins' | 'invincibility';

export interface PowerUpDef {
  id: string;
  kind: PowerUpKind;
  label: string;
  durationMs: number;
  color: string;
  instant?: boolean;
}

export interface PowerUpPlacement {
  id: number;
  powerUpDefId: string;
  laneX: number;
  z: number;
  collected: boolean;
}

export interface ActivePowerUp {
  kind: PowerUpKind;
  remainingMs: number;
  totalMs: number;
}

// ── Procedural level generation ─────────────────────────────────────────────

export type SegmentKind = 'gate' | 'obstacle' | 'enemyCrowd' | 'boss' | 'castle';

export interface SegmentSpec {
  kind: SegmentKind;
  startZ: number;
  length: number;
  gates?: GatePlacement[];
  obstacles?: ObstaclePlacement[];
  enemyCrowd?: EnemyCrowdSpec;
  boss?: { bossDefId: string; addWaveCount: number; laneX: number; z: number };
  castle?: { hp: number; z: number };
}

export interface DifficultyTier {
  tier: number;
  speedMultiplier: number;
  enemySizeMultiplier: number;
  obstacleFrequency: number;
  gateComplexityMax: number;
  bossHpMultiplier: number;
}

export interface Level {
  index: number;
  worldId: string;
  seed: number;
  segments: SegmentSpec[];
  difficulty: DifficultyTier;
  totalLength: number;
}

// ── Environments ──────────────────────────────────────────────────────────

export interface EnvironmentDef {
  id: string;
  name: string;
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  groundLineColor: string;
  fogColor: string;
  obstacleAccent: string;
  castleColor: string;
  ambientParticleColor: string;
  musicRootHz: number;
  musicScale: number[];
  musicTempoMs: number;
}

// ── HUD / runtime state ──────────────────────────────────────────────────

export interface HudState {
  crowdCount: number;
  coins: number;
  levelIndex: number;
  worldName: string;
  score: number;
  combo: number;
  comboMultiplier: number;
  chargeReady: boolean;
  chargeActive: boolean;
  chargeCooldownMs: number;
  chargeCooldownTotalMs: number;
  paused: boolean;
  handDetected: boolean;
  activePowerUps: ActivePowerUp[];
  enemyCrowdCount: number | null;
  bossHpPct: number | null;
  bossName: string | null;
  castleHpPct: number | null;
  distance: number;
  segmentLabel: string;
  playerAlive: boolean;
}

export interface GameOverSummary {
  score: number;
  levelsCompleted: number;
  highestCrowd: number;
  bossesDefeated: number;
  enemiesDefeated: number;
  distance: number;
  coinsEarned: number;
  bestCombo: number;
}

// ── Save data ─────────────────────────────────────────────────────────────

export type CosmeticCategory = 'hat' | 'cape' | 'trail' | 'aura' | 'colorTheme';

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  label: string;
  cost: number;
  color?: string;
}

export interface SaveSettings {
  cameraDeviceId: string | null;
  gestureSensitivity: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  musicVolume: number;
  sfxVolume: number;
}

export interface Statistics {
  gamesPlayed: number;
  highScore: number;
  longestRunLevels: number;
  highestCrowd: number;
  bossesDefeated: number;
  levelsCompleted: number;
  totalCoinsEarned: number;
}

export interface SaveData {
  coins: number;
  unlockedCosmetics: string[];
  selectedCosmetics: Record<CosmeticCategory, string>;
  statistics: Statistics;
  settings: SaveSettings;
}

export interface LeaderboardEntry {
  score: number;
  levelsCompleted: number;
  highestCrowd: number;
  bossesDefeated: number;
  date: number;
}

export interface FloatingText {
  id: number;
  laneX: number;
  depthZ: number;
  height: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export type Screen =
  | 'calibrating'
  | 'menu'
  | 'playing'
  | 'gameover'
  | 'shop'
  | 'leaderboard'
  | 'settings'
  | 'howtoplay'
  | 'credits';
