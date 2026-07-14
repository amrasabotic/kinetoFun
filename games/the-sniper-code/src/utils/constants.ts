// ── World / scene ─────────────────────────────────────────────────────────────
export const WORLD_W = 2400;
export const WORLD_H = 1000;
/** Baseline (feet) where ground-standing actors rest. */
export const GROUND_Y = 770;

/** Pixels per world unit at zoom = 1 (zoom levels multiply this). */
export const BASE_PPU = 0.5;
export const ZOOM_LEVELS = [2, 4, 8] as const;

// The aim point (scope centre) can pan within this world rectangle.
export const PAN_MIN_X = 380;
export const PAN_MAX_X = WORLD_W - 380;
export const PAN_MIN_Y = 300;
export const PAN_MAX_Y = 840;

// ── Aim feel ──────────────────────────────────────────────────────────────────
export const SMOOTH_AIM_DEFAULT = 0.22;   // higher = snappier, lower = smoother
export const SWAY_AMP_BASE = 7;           // screen-px breathing sway at zoom 2
export const SWAY_STEADY_MULT = 0.22;     // sway multiplier while STEADY AIM is active

// ── Gesture thresholds ────────────────────────────────────────────────────────
export const PINCH_THRESHOLD = 0.06;
export const PINCH_HOLD_MS = 120;
export const FIRE_COOLDOWN_MS = 460;
export const ZOOM_HOLD_MS = 750;          // open-palm hold to cycle one zoom step
export const STEADY_TIME_MS = 650;        // hold still this long → STEADY AIM
export const STEADY_STD_MAX = 0.011;      // max normalised cursor std-dev to count as steady

// ── Menus / HUD dwell ─────────────────────────────────────────────────────────
export const DWELL_MS = 850;
export const HUD_DWELL_MS = 1050;

// ── Scoring ───────────────────────────────────────────────────────────────────
export const HEAD_POINTS = 200;
export const BODY_POINTS = 100;
export const MISS_POINTS = -25;
export const CIVILIAN_POINTS = -500;
export const COMBO_MAX = 5;
export const TIME_BONUS_PER_SEC = 10;
export const BULLET_BONUS = 25;
export const STEADY_SHOT_BONUS = 30;
export const PERFECT_BONUS = 500;
export const STEADY_SCORE_MULT = 1.25;    // applied to hit points while steady

// ── Actor geometry (world units, before per-actor + mission scaling) ──────────
export const ACTOR_HEAD_R = 27;
export const ACTOR_BODY_W = 48;
export const ACTOR_BODY_H = 112;

// Aim assist (screen px) — magnetises the crosshair toward the nearest valid head
export const AIM_ASSIST_RADIUS = 40;

// ── Roles & palette ───────────────────────────────────────────────────────────
export type Role = 'target' | 'civilian' | 'vip' | 'attacker' | 'decoy' | 'hostage';

export const ROLE_COLORS: Record<Role, string> = {
  target:   '#dc2626',
  civilian: '#64748b',
  vip:      '#22d3ee',
  attacker: '#dc2626',
  decoy:    '#a16207',
  hostage:  '#f5d0a9',
};

// ── Settings ──────────────────────────────────────────────────────────────────
export interface Settings {
  sensitivity: number;   // 0.6 .. 1.6
  smoothing: number;     // 0.10 .. 0.40 (alpha)
  sound: boolean;
  scopeOpacity: number;  // 0.55 .. 0.95 (darkness outside scope)
  leftHanded: boolean;
  highContrast: boolean;
  aimAssist: boolean;
  tutorialDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1.0,
  smoothing: SMOOTH_AIM_DEFAULT,
  sound: true,
  scopeOpacity: 0.82,
  leftHanded: false,
  highContrast: false,
  aimAssist: false,
  tutorialDone: false,
};
