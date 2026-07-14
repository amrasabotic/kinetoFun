/** All tunable constants for Gesture Hill Adventure. */

// ── Physics ───────────────────────────────────────────────────────────────────

export const GRAVITY          = 0.002;   // Matter.js gravity scale
export const CHASSIS_W        = 120;
export const CHASSIS_H        = 40;
export const CHASSIS_DENSITY  = 0.006;
export const CHASSIS_FRICTION = 0.1;
export const CHASSIS_AIR_FRIC = 0.015;
export const CHASSIS_RESTITUT = 0.05;

export const WHEEL_R          = 24;
export const WHEEL_DENSITY    = 0.004;
export const WHEEL_FRICTION   = 0.92;   // high traction
export const WHEEL_AIR_FRIC   = 0.008;
export const WHEEL_RESTITUT   = 0.25;

export const SUSP_STIFFNESS   = 0.18;   // spring softness
export const SUSP_DAMPING     = 0.85;   // anti-bounce
export const SUSP_LENGTH      = 28;     // natural constraint length
export const ANTI_STIFFNESS   = 0.55;   // prevents sideways sway
export const ANTI_DAMPING     = 0.4;

// Wheel base (distance from center to wheel attachment)
export const WHEEL_BASE_X     = 46;     // half distance front↔rear
export const WHEEL_BASE_Y     = 18;     // vertical offset below chassis center

// ── Vehicle Dynamics ──────────────────────────────────────────────────────────

export const MAX_WHEEL_SPIN     = 28;   // rad/s maximum angular velocity
export const WHEEL_ACCEL        = 0.18; // angular velocity lerp speed
export const BOOST_FORCE        = 0.04; // force magnitude per frame during boost
export const BOOST_DURATION_MS  = 1200;
export const BOOST_COOLDOWN_MS  = 5000;
export const MAX_VEHICLE_SPEED  = 650;  // pixels/second cap

// ── Terrain ───────────────────────────────────────────────────────────────────

export const TERRAIN_BASE_Y       = 480;  // flat ground y in world space
export const TERRAIN_POINT_STEP   = 60;   // x distance between terrain control points
export const TERRAIN_VISIBLE_AHEAD = 3000; // generate this far ahead of camera
export const TERRAIN_KEEP_BEHIND  = 1000; // keep this far behind camera (cleanup)
export const TERRAIN_SEG_STEP     = 10;   // fine detail step for rendering

// Min / max hill heights relative to TERRAIN_BASE_Y
export const HILL_AMP_MIN  = 40;
export const HILL_AMP_MAX  = 180;
export const HILL_FREQ_MIN = 0.004;
export const HILL_FREQ_MAX = 0.012;

// ── Fuel ─────────────────────────────────────────────────────────────────────

export const FUEL_MAX            = 100;
export const FUEL_DRAIN_PER_SEC  = 3.5;   // baseline drain
export const FUEL_DRAIN_BOOST    = 9;     // extra drain while boosting
export const FUEL_RESTORE        = 40;    // fuel added per can
export const FUEL_CAN_INTERVAL   = 400;   // ~every 400 meters

// ── Coins ────────────────────────────────────────────────────────────────────

export const COIN_SCORE          = 100;
export const COIN_INTERVAL       = 180;   // place every ~180 world units
export const COIN_CLUSTER_SIZE   = 3;     // coins per cluster
export const COIN_PICKUP_RADIUS  = 55;    // collection distance
export const COIN_R              = 14;    // visual radius

// ── Fuel can pickup ───────────────────────────────────────────────────────────

export const FUEL_PICKUP_RADIUS  = 70;
export const FUEL_CAN_W          = 28;
export const FUEL_CAN_H          = 38;

// ── Obstacle ─────────────────────────────────────────────────────────────────

export const OBSTACLE_INTERVAL   = 600;  // place every ~600 meters

// ── Scoring ──────────────────────────────────────────────────────────────────

export const SCORE_PER_METER      = 1;
export const SCORE_AIRTIME_PER_S  = 25;
export const SCORE_BACKFLIP       = 350;
export const SCORE_FRONTFLIP      = 350;
export const SCORE_DOUBLE_FLIP    = 750;
export const SCORE_PERFECT_LAND   = 200;
export const SCORE_BIG_JUMP       = 150;
export const SCORE_NEAR_CRASH     = 50;

// ── Stunt Detection ───────────────────────────────────────────────────────────

export const FLIP_THRESHOLD_RAD   = Math.PI * 1.85;  // how much rotation = a flip
export const AIRBORNE_MIN_HEIGHT  = 18;               // min height above terrain (px)
export const PERFECT_LAND_VEL_Y   = 6;                // max vy for perfect landing
export const BIG_JUMP_HEIGHT_PX   = 120;
export const CRASH_INVERT_MS      = 2200;             // ms upside-down before crash

// ── Camera ────────────────────────────────────────────────────────────────────

export const CAM_LERP_X      = 0.055;
export const CAM_LERP_Y      = 0.08;
export const CAM_LERP_ZOOM   = 0.04;
export const CAM_LOOK_AHEAD  = 260;    // pixels ahead of vehicle
export const CAM_OFFSET_Y    = -90;   // camera sits above vehicle center
export const CAM_ZOOM_DEFAULT = 1.0;
export const CAM_ZOOM_FAST   = 0.78;  // zoom out at high speed
export const CAM_SPEED_ZOOM  = 340;   // speed at which zoom-out begins

// ── Difficulty Scaling ────────────────────────────────────────────────────────

export const DIFFICULTY_STEP_M    = 1000; // distance in meters per difficulty step
export const DIFFICULTY_MAX       = 5;    // max difficulty level

// ── Environments ─────────────────────────────────────────────────────────────

export const ENV_CHANGE_INTERVAL = 1200; // meters between environment changes

// ── Particles ─────────────────────────────────────────────────────────────────

export const PARTICLE_MAX        = 300;
export const DUST_SPAWN_INTERVAL = 40;   // ms

// ── Save ─────────────────────────────────────────────────────────────────────

export const SAVE_KEY = 'gha_save_v1';

// ── Combo ─────────────────────────────────────────────────────────────────────

export const COMBO_TIMEOUT_MS = 4000;  // combo resets after this with no stunt
export const COMBO_MAX        = 8;

// ── Collision categories (bit flags) ─────────────────────────────────────────

export const CAT_VEHICLE  = 0x0001;
export const CAT_TERRAIN  = 0x0002;
export const CAT_OBSTACLE = 0x0004;

// ── Vehicle skins ─────────────────────────────────────────────────────────────

import type { VehicleSkin } from '../types';

export const VEHICLE_SKINS: VehicleSkin[] = [
  {
    id: 'buggy',
    name: 'Desert Buggy',
    emoji: '🚙',
    cost: 0,
    bodyColor:    '#FF6B35',
    cabinColor:   '#E55A25',
    wheelColor:   '#333333',
    rimColor:     '#888888',
    accentColor:  '#FFE878',
    exhaustColor: '#666666',
    description:  'The trusty starter buggy. Fast and rugged.',
  },
  {
    id: 'monster',
    name: 'Monster Crusher',
    emoji: '🚛',
    cost: 500,
    bodyColor:    '#2E7D32',
    cabinColor:   '#1B5E20',
    wheelColor:   '#212121',
    rimColor:     '#616161',
    accentColor:  '#A5D6A7',
    exhaustColor: '#424242',
    description:  'Huge wheels, huge attitude.',
  },
  {
    id: 'beach',
    name: 'Beach Cruiser',
    emoji: '🏖️',
    cost: 600,
    bodyColor:    '#03A9F4',
    cabinColor:   '#0277BD',
    wheelColor:   '#5D4037',
    rimColor:     '#8D6E63',
    accentColor:  '#FFF9C4',
    exhaustColor: '#795548',
    description:  'Laid-back ride for sun and sand.',
  },
  {
    id: 'police',
    name: 'Patrol Cruiser',
    emoji: '🚓',
    cost: 700,
    bodyColor:    '#1A237E',
    cabinColor:   '#283593',
    wheelColor:   '#37474F',
    rimColor:     '#90A4AE',
    accentColor:  '#FFFFFF',
    exhaustColor: '#607D8B',
    description:  'Protect and serve — at full speed.',
  },
  {
    id: 'space',
    name: 'Space Rover',
    emoji: '🛸',
    cost: 900,
    bodyColor:    '#7B1FA2',
    cabinColor:   '#6A1B9A',
    wheelColor:   '#424242',
    rimColor:     '#B0BEC5',
    accentColor:  '#E040FB',
    exhaustColor: '#9C27B0',
    description:  'Engineered for alien terrain.',
  },
  {
    id: 'neon',
    name: 'Neon Racer',
    emoji: '⚡',
    cost: 1200,
    bodyColor:    '#E91E63',
    cabinColor:   '#C2185B',
    wheelColor:   '#212121',
    rimColor:     '#FF9800',
    accentColor:  '#FF4081',
    exhaustColor: '#E91E63',
    description:  'Pure speed. Pure style.',
  },
];
