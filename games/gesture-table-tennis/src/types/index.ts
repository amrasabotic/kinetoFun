export type GameScreen =
  | 'menu' | 'modeSelect' | 'calibration' | 'playing'
  | 'paused' | 'gameOver' | 'cosmetics' | 'statistics'
  | 'settings' | 'howToPlay' | 'credits' | 'tournament';

export type GameMode = 'classic' | 'arcade' | 'survival' | 'precision' | 'smash' | 'tournament';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type AIPersonality = 'beginner' | 'balanced' | 'defender' | 'attacker' | 'spinMaster' | 'champion';

export type ArenaId = 'sportsHall' | 'beach' | 'rooftop' | 'cyber' | 'forest' | 'space' | 'neon' | 'temple';

export type PaddleSkinId = 'wood' | 'carbon' | 'crystal' | 'neon' | 'galaxy' | 'fire' | 'ice' | 'robot' | 'golden' | 'retro';
export type BallSkinId = 'classic' | 'neon' | 'fireball' | 'rainbow' | 'crystal' | 'metallic';
export type TrailId = 'none' | 'lightning' | 'stars' | 'smoke' | 'fire' | 'magic' | 'rainbow';

export interface Vec3 { x: number; y: number; z: number; }
export interface Vec2 { x: number; y: number; }

export interface Ball {
  pos: Vec3;
  vel: Vec3;
  spin: Vec3; // x=topspin(+)/backspin(-), z=sidespin
  radius: number;
  bounceCount: number;
  lastHitBy: 'player' | 'ai' | null;
  isActive: boolean;
}

export interface Paddle {
  pos: Vec3;
  angle: number;     // wrist tilt in radians
  vel: Vec3;
  width: number;
  height: number;
  thickness: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'spark' | 'trail' | 'smoke' | 'confetti' | 'star' | 'energy' | 'dust';
  gravity?: boolean;
  rotation?: number;
  rotationSpeed?: number;
}

export interface Target {
  id: number;
  worldX: number; worldY: number;
  radius: number;
  type: 'static' | 'moving' | 'tiny' | 'golden' | 'exploding';
  points: number;
  hit: boolean;
  moveDir: Vec2;
  moveSpeed: number;
  pulsePhase: number;
}

export interface ScoreEvent {
  points: number;
  label: string;
  screenX: number; screenY: number;
  life: number;
  maxLife: number;
  color: string;
  scale: number;
}

export interface ReplayFrame {
  ball: { pos: Vec3; vel: Vec3; spin: Vec3 };
  playerPaddle: { pos: Vec3; angle: number };
  aiPaddle: { pos: Vec3; angle: number };
  timestamp: number;
}

export type MatchPhase = 'countdown' | 'serving' | 'rally' | 'pointWon' | 'matchOver' | 'paused';

export interface MatchScore {
  player: number;
  ai: number;
  serves: number;
  isPlayerServing: boolean;
  sets: { player: number; ai: number }[];
}

export type StageMod = 'fastBall' | 'moreSpin' | 'smallPaddle' | 'movingTable' | 'wind' | 'randomBounce';

export interface ArcadeStage {
  number: number;
  name: string;
  description: string;
  mods: StageMod[];
  targetScore: number;
  reward?: { type: 'coins'; amount: number } | { type: 'cosmetic'; id: string };
}

export interface GameState {
  mode: GameMode;
  phase: MatchPhase;
  ball: Ball;
  playerPaddle: Paddle;
  aiPaddle: Paddle;
  score: MatchScore;
  combo: number;
  maxCombo: number;
  rallyCount: number;
  longestRally: number;
  powerShotCharge: number;
  powerShotCooldown: number;
  isPowerShot: boolean;
  isChargingPower: boolean;
  scoreEvents: ScoreEvent[];
  particles: Particle[];
  targets: Target[];
  arenaId: ArenaId;
  difficulty: AIDifficulty;
  countdown: number;
  countdownTimer: number;
  handDetected: boolean;
  swingSpeed: number;
  currentSpin: number;
  stageNumber: number;
  stageMods: StageMod[];
  survivalScore: number;
  survivalTime: number;
  smashScore: number;
  smashCount: number;
  precisionScore: number;
  precisionCombo: number;
  timeLeft: number;
  matchWon: boolean;
  matchLost: boolean;
  pointWonTimer: number;
  lastPointWinner: 'player' | 'ai' | null;
  replayBuffer: ReplayFrame[];
  isReplaying: boolean;
  cameraShake: number;
  slowMotion: number;
  tableMoveOffset: number;
  windForce: number;
  perfectHitFlash: number;
  coins: number;
  tournamentRound: number;
  tournamentWins: number;
}

export interface Statistics {
  matchesPlayed: number;
  matchesWon: number;
  longestRally: number;
  highestCombo: number;
  perfectHits: number;
  smashCount: number;
  powerShotsUsed: number;
  coinsEarned: number;
  tournamentWins: number;
  hoursPlayed: number;
  totalReturns: number;
  highScores: Partial<Record<GameMode, number>>;
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  gestureSensitivity: number;
  handSmoothing: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  handedness: 'left' | 'right';
  defaultDifficulty: AIDifficulty;
  defaultArena: ArenaId;
}

export interface SaveData {
  coins: number;
  statistics: Statistics;
  settings: GameSettings;
  selectedPaddle: PaddleSkinId;
  selectedBall: BallSkinId;
  selectedTrail: TrailId;
  unlockedPaddles: PaddleSkinId[];
  unlockedBalls: BallSkinId[];
  unlockedTrails: TrailId[];
  arcadeHighestStage: number;
  tournamentWins: number;
}

export interface TournamentOpponent {
  id: string;
  name: string;
  personality: AIPersonality;
  difficulty: AIDifficulty;
  avatar: string;
  description: string;
  defeated: boolean;
  reward?: { type: 'paddle' | 'ball' | 'trail' | 'coins'; id?: string; amount?: number };
}
