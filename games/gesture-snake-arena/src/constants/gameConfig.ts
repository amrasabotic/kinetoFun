import type {
  SnakeSkin, HeadAccessory, Trail, Environment, GameSettings
} from '../types';

// ── Arena ────────────────────────────────────────────────────────────────────

export const ARENA_WIDTH  = 6000;
export const ARENA_HEIGHT = 6000;
export const ARENA_BORDER = 80;   // soft boundary thickness

// ── Snake ─────────────────────────────────────────────────────────────────────

export const SEGMENT_DISTANCE  = 8;   // spacing between segments
export const SNAKE_RADIUS      = 10;  // collision radius
export const PLAYER_BASE_SPEED = 2.2;
export const PLAYER_MAX_SPEED  = 5.5;
export const PLAYER_BOOST_SPEED = 8.0;
export const BOOST_LENGTH_DRAIN = 0.015; // segments lost per frame while boosting
export const BOOST_COOLDOWN_MS = 2000;
export const TURN_SPEED        = 0.07; // radians per frame (player)
export const MIN_SNAKE_LENGTH  = 6;
export const INITIAL_LENGTH    = 20;
export const AI_INITIAL_LENGTH = 15;

// ── AI ────────────────────────────────────────────────────────────────────────

export const AI_COUNT          = 20;
export const AI_BASE_SPEED     = 1.8;
export const AI_MAX_SPEED      = 4.0;
export const AI_TURN_SPEED     = 0.05;
export const AI_VISION_RADIUS  = 350;
export const AI_BOOST_CHANCE   = 0.003;

// ── Collectibles ──────────────────────────────────────────────────────────────

export const ORB_COUNT         = 300;
export const ORB_RESPAWN_MS    = 800;
export const POWERUP_COUNT     = 8;
export const POWERUP_LIFETIME_MS = 15000;
export const POWERUP_DURATION_MS = 15000;
export const MAGNET_RADIUS     = 200;
export const COMBO_WINDOW_MS   = 1500;

// ── Camera ────────────────────────────────────────────────────────────────────

export const CAM_LERP          = 0.07;
export const CAM_LOOK_AHEAD    = 60;   // px ahead of snake head
export const CAM_ZOOM_SMALL    = 1.2;
export const CAM_ZOOM_LARGE    = 0.55;
export const CAM_ZOOM_THRESHOLD_SMALL = 40;   // segments
export const CAM_ZOOM_THRESHOLD_LARGE = 200;  // segments

// ── Particles ─────────────────────────────────────────────────────────────────

export const PARTICLE_POOL_SIZE = 3000;
export const EXPLOSION_PARTICLES = 120;
export const PICKUP_PARTICLES   = 8;
export const BOOST_PARTICLES    = 4;

// ── Scoring ───────────────────────────────────────────────────────────────────

export const SCORE_PER_ORB     = 10;
export const SCORE_PER_SECOND  = 1;
export const SCORE_PER_KILL    = 500;
export const COMBO_MULTIPLIERS = [1, 1.5, 2, 3, 5, 8, 10];

// ── Skins ─────────────────────────────────────────────────────────────────────

export const SNAKE_SKINS: SnakeSkin[] = [
  { id: 'default',  name: 'Classic',  cost: 0,    colors: ['#5EED7A','#3DBF5C','#2A9042'], unlocked: true },
  { id: 'fire',     name: 'Fire',     cost: 300,  colors: ['#FF5733','#FF8C00','#FFD700'], unlocked: false },
  { id: 'ice',      name: 'Ice',      cost: 300,  colors: ['#A0E9FF','#5BC0EB','#2176AE'], unlocked: false },
  { id: 'neon',     name: 'Neon',     cost: 400,  colors: ['#39FF14','#00F5FF','#FF007C'], unlocked: false },
  { id: 'rainbow',  name: 'Rainbow',  cost: 600,  colors: ['#FF0000','#FF7700','#00BBFF'], unlocked: false },
  { id: 'jungle',   name: 'Jungle',   cost: 350,  colors: ['#2D6A4F','#40916C','#95D5B2'], unlocked: false },
  { id: 'galaxy',   name: 'Galaxy',   cost: 500,  colors: ['#7B2FBE','#BB86FC','#03DAC6'], unlocked: false },
  { id: 'robot',    name: 'Robot',    cost: 450,  colors: ['#8D8D8D','#B0B0B0','#4A4A4A'], unlocked: false },
  { id: 'candy',    name: 'Candy',    cost: 350,  colors: ['#FF69B4','#FF99CC','#FF3E9D'], unlocked: false },
  { id: 'crystal',  name: 'Crystal',  cost: 550,  colors: ['#C0EFFF','#80D4F0','#40B8E0'], unlocked: false },
  { id: 'shadow',   name: 'Shadow',   cost: 700,  colors: ['#1A1A2E','#16213E','#0F3460'], unlocked: false },
];

export const HEAD_ACCESSORIES: HeadAccessory[] = [
  { id: 'none',       name: 'None',        cost: 0,   unlocked: true  },
  { id: 'crown',      name: 'Crown',       cost: 250, unlocked: false },
  { id: 'helmet',     name: 'Helmet',      cost: 200, unlocked: false },
  { id: 'wizard',     name: 'Wizard Hat',  cost: 300, unlocked: false },
  { id: 'pirate',     name: 'Pirate Hat',  cost: 275, unlocked: false },
  { id: 'sunglasses', name: 'Sunglasses',  cost: 150, unlocked: false },
  { id: 'headphones', name: 'Headphones',  cost: 200, unlocked: false },
];

export const TRAILS: Trail[] = [
  { id: 'none',      name: 'None',      cost: 0,   unlocked: true  },
  { id: 'stars',     name: 'Stars',     cost: 200, unlocked: false },
  { id: 'fire',      name: 'Fire',      cost: 250, unlocked: false },
  { id: 'rainbow',   name: 'Rainbow',   cost: 350, unlocked: false },
  { id: 'lightning', name: 'Lightning', cost: 300, unlocked: false },
  { id: 'leaves',    name: 'Leaves',    cost: 200, unlocked: false },
  { id: 'snow',      name: 'Snow',      cost: 200, unlocked: false },
];

// ── Environments ──────────────────────────────────────────────────────────────

export const ENVIRONMENTS: Environment[] = [
  {
    id: 'forest',
    name: 'Forest',
    bgColors: ['#1a3a1a','#2d5a2d'],
    groundColor: '#2a4a2a',
    accentColor: '#5EED7A',
    particleColor: '#90EE90',
    decorationColors: ['#228B22','#32CD32','#006400'],
  },
  {
    id: 'desert',
    name: 'Desert',
    bgColors: ['#8B6914','#C9A84C'],
    groundColor: '#A0752B',
    accentColor: '#FFD700',
    particleColor: '#F4D03F',
    decorationColors: ['#8B4513','#D2691E','#CD853F'],
  },
  {
    id: 'ice',
    name: 'Ice World',
    bgColors: ['#1a3a5c','#2176AE'],
    groundColor: '#A8D8EA',
    accentColor: '#A0E9FF',
    particleColor: '#E0F7FF',
    decorationColors: ['#5BC0EB','#A0E9FF','#FFFFFF'],
  },
  {
    id: 'volcano',
    name: 'Volcano',
    bgColors: ['#2a0a0a','#6b1a1a'],
    groundColor: '#3a0a0a',
    accentColor: '#FF4500',
    particleColor: '#FF6347',
    decorationColors: ['#8B0000','#B22222','#FF4500'],
  },
  {
    id: 'candy',
    name: 'Candy Land',
    bgColors: ['#FF80CC','#FFB6E1'],
    groundColor: '#FF99DD',
    accentColor: '#FF1493',
    particleColor: '#FFB6C1',
    decorationColors: ['#FF69B4','#FF1493','#FF007C'],
  },
  {
    id: 'space',
    name: 'Space',
    bgColors: ['#0a0a1e','#0d0d2e'],
    groundColor: '#111133',
    accentColor: '#BB86FC',
    particleColor: '#E0AAFF',
    decorationColors: ['#7B2FBE','#BB86FC','#FFFFFF'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bgColors: ['#003366','#0066CC'],
    groundColor: '#004080',
    accentColor: '#00BFFF',
    particleColor: '#87CEEB',
    decorationColors: ['#006994','#0099CC','#00BFFF'],
  },
  {
    id: 'cyber',
    name: 'Cyber City',
    bgColors: ['#0a0014','#14002a'],
    groundColor: '#0d0020',
    accentColor: '#00F5FF',
    particleColor: '#39FF14',
    decorationColors: ['#7700FF','#00F5FF','#FF0090'],
  },
];

// ── AI names & colors ─────────────────────────────────────────────────────────

export const AI_NAMES = [
  'Cobra','Neon','Viper','Shadow','Blaze','Frost','Ruby','Volt',
  'Storm','Ghost','Luna','Titan','Spark','Jade','Zara','Dusk',
  'Flux','Nova','Pyre','Echo','Aura','Bolt','Sage','Crimson',
];

export const AI_SKIN_PALETTES: string[][] = [
  ['#FF5733','#C70039','#900C3F'],
  ['#00F5FF','#0099CC','#006699'],
  ['#FFD700','#FFA500','#FF6B00'],
  ['#9B59B6','#6C3483','#4A235A'],
  ['#1ABC9C','#17A589','#0E6655'],
  ['#E74C3C','#CB4335','#922B21'],
  ['#F39C12','#E67E22','#CA6F1E'],
  ['#2ECC71','#27AE60','#1E8449'],
  ['#3498DB','#2980B9','#1A5276'],
  ['#E91E63','#C2185B','#880E4F'],
];

// ── Default settings ──────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.4,
  soundVolume: 0.7,
  gestureSensitivity: 1.0,
  graphicsQuality: 'high',
  selfCollision: false,
  showMinimap: true,
  showFPS: false,
};

// ── Quest templates ───────────────────────────────────────────────────────────

export const QUEST_TEMPLATES = [
  { type: 'collect_energy' as const,   description: 'Collect {n} energy orbs',   targets: [50,100,200],  reward: 50 },
  { type: 'defeat_snakes'  as const,   description: 'Defeat {n} AI snakes',      targets: [3,5,10],      reward: 100 },
  { type: 'reach_length'   as const,   description: 'Reach length {n}',          targets: [50,100,200],  reward: 75 },
  { type: 'survive_time'   as const,   description: 'Survive for {n} seconds',   targets: [60,120,300],  reward: 80 },
  { type: 'collect_powerups' as const, description: 'Collect {n} power-ups',     targets: [2,3,5],       reward: 60 },
  { type: 'use_boost'      as const,   description: 'Use boost {n} times',       targets: [10,20,30],    reward: 40 },
];
