// ── Reference scale ───────────────────────────────────────────────────────────
// Physics is authored at a 600px reference height and scaled by U = ch / 600 so
// the arc looks the same on any screen size.
export const REF_H = 600;

// ── Layout (fractions of the canvas) ──────────────────────────────────────────
export const GROUND_FRAC = 0.84;     // ground line as a fraction of canvas height
export const PLAYER_X_FRAC = 0.12;   // player's horizontal anchor

// ── Throw physics (reference px, before ×U) ───────────────────────────────────
export const GRAVITY = 0.42;         // px/frame² at 60fps, ×U
export const SPEAR_V_MIN = 13;       // launch speed at power 0
export const SPEAR_V_MAX = 31;       // launch speed at full charge
export const QUICK_POWER = 0.55;     // power used by a pinch quick-throw
export const MIN_THROW_POWER = 0.22; // floor for a barely-charged release
export const CHARGE_MS = 1100;       // fist hold to reach full power
export const THROW_COOLDOWN_MS = 320;
export const AIM_MIN_DEG = -86;      // most-upward launch angle (deg from +x)
export const AIM_MAX_DEG = 18;       // slightly downward launch angle

// ── Enemy projectiles ─────────────────────────────────────────────────────────
export const ENEMY_SPEAR_V = 9;      // ×U; lobbed toward the player
export const ENEMY_WINDUP_MS = 900;  // telegraph before an enemy throws

// ── Gesture thresholds ────────────────────────────────────────────────────────
export const PINCH_THRESHOLD = 0.055;
export const SWIPE_VX = 0.05;        // normalised palm vx/frame to trigger a dodge
export const DODGE_MS = 620;         // invulnerable dodge window
export const DODGE_COOLDOWN_MS = 900;

// ── Player ────────────────────────────────────────────────────────────────────
export const MAX_HEARTS = 3;
export const HIT_IFRAME_MS = 1100;

// ── Menus / HUD dwell ─────────────────────────────────────────────────────────
export const DWELL_MS = 820;
export const HUD_DWELL_MS = 1020;

// ── Scoring ───────────────────────────────────────────────────────────────────
export const BODY_POINTS = 100;
export const HEAD_POINTS = 250;
export const AIRBORNE_BONUS = 75;    // killing a jumping/airborne enemy
export const LONG_BONUS = 60;        // kill from far away
export const COMBO_MAX = 10;
export const WAVE_CLEAR_BONUS = 200;
export const PERFECT_WAVE_BONUS = 300;
export const COIN_PER_KILL = 1;
export const COIN_PER_HEAD = 2;
export const BOSS_COINS = 25;

// ── Power-ups ─────────────────────────────────────────────────────────────────
export const POWERUP_DROP_CHANCE = 0.16;  // per non-boss kill
export const POWERUP_FALL_V = 2.2;        // ×U

// ── Roles & palette ───────────────────────────────────────────────────────────
export type Settings = {
  sensitivity: number;   // 0.6 .. 1.6
  smoothing: number;     // 0.12 .. 0.45 (aim alpha)
  sound: boolean;
  leftHanded: boolean;
  highContrast: boolean;
  aimAssist: boolean;
  throwMode: 'charge' | 'quick' | 'both';
  tutorialDone: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1.0,
  smoothing: 0.28,
  sound: true,
  leftHanded: false,
  highContrast: false,
  aimAssist: false,
  throwMode: 'both',
  tutorialDone: false,
};
