// ── Global tunables (config-driven, avoid hardcoding values in system code) ─

export const MAX_UNITS = 550;
export const INITIAL_CROWD_SIZE = 10;
export const MAX_RENDERED_UNITS_PER_TEAM = 220;

// Track / world layout
export const TRACK_HALF_WIDTH = 4.2;
export const BASE_RUN_SPEED = 5.2; // world Z units / second
export const MAX_VIEW_DEPTH = 42; // world Z units visible ahead
export const PLAYER_FRONT_OFFSET = 4; // constant relZ distance of the player crowd from the camera
export const COLLISION_WINDOW = 0.6; // world Z tolerance for "crossed the player's line" checks
export const GATE_CATCH_RADIUS = 0.9; // + crowd half-width, beyond this a gate group is a total miss
export const ENGAGE_SPAWN_AHEAD = 18; // relZ at which enemy crowds/bosses/castle spawn their entities

// Gesture / control
export const WRIST_X_SMOOTH_FACTOR = 0.18;
export const CHARGE_FIST_HOLD_MS = 500;
export const CHARGE_DURATION_MS = 3000;
export const CHARGE_COOLDOWN_MS = 20000;
export const PAUSE_PALM_HOLD_MS = 1000;
export const CALIBRATION_STABLE_MS = 2000;

// Flocking weights
export const FLOCK_SEPARATION_RADIUS = 0.32;
export const FLOCK_SEPARATION_WEIGHT = 1.6;
export const FLOCK_COHESION_WEIGHT = 0.9;
export const FLOCK_ALIGNMENT_WEIGHT = 0.5;
export const FLOCK_MAX_STEER_SPEED = 6.5;
export const FLOCK_NEIGHBOR_RADIUS = 0.9;
export const GRID_CELL_SIZE = 0.7;

// Formation
export const FORMATION_UNIT_SPACING = 0.34;
export const FORMATION_MAX_COLUMNS = 12;

// Levels / progression
export const LEVELS_PER_BOSS = 5;
export const GATE_SEGMENT_LENGTH = 10;
export const OBSTACLE_SEGMENT_LENGTH = 8;
export const ENEMY_SEGMENT_LENGTH = 12;
export const BOSS_SEGMENT_LENGTH = 24;
export const CASTLE_SEGMENT_LENGTH = 14;
export const SEGMENTS_PER_LEVEL_MIN = 3;
export const SEGMENTS_PER_LEVEL_MAX = 5;

// Combo
export const COMBO_RESET_ON_MISS = true;
export const COMBO_MAX_MULTIPLIER = 5;

// Scoring weights
export const SCORE_PER_UNIT_SURVIVED = 2;
export const SCORE_PER_ENEMY_DEFEATED = 5;
export const SCORE_PER_BOSS_DEFEAT = 500;
export const SCORE_PER_LEVEL_COMPLETE = 150;
export const SCORE_NO_DAMAGE_BONUS = 200;
export const SCORE_PERFECT_LEVEL_BONUS = 100;

// Combat
export const COMBAT_TICK_MS = 90; // how often a unit-for-unit trade happens on crowd clash
export const CHARGE_MODE_COMBAT_SPEED_MULTIPLIER = 2.5;

// Boss / castle damage-per-second (scaled by remaining crowd size)
export const BOSS_DPS_PER_UNIT = 0.4;
export const CASTLE_DPS_PER_UNIT = 0.7;
export const CHARGE_DPS_MULTIPLIER = 2.5;

// Object pooling
export const OBSTACLE_POOL_SIZE = 40;
export const GATE_POOL_SIZE = 12;
export const POWERUP_POOL_SIZE = 20;
export const PARTICLE_POOL_SIZE = 2500;
