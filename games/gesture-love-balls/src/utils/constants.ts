export const GAME_W = 900;
export const GAME_H = 550;

export const BALL_R        = 22;
export const LINE_W        = 14;
export const MIN_DRAW_DIST = 8;

// Pinch gesture (thumb-tip ↔ index-tip normalised distance)
export const PINCH_THRESHOLD  = 0.07;
export const PINCH_CONFIRM_MS = 100;   // sustain pinch this long before drawing starts
export const PINCH_RELEASE_MS = 60;    // sustain release this long before stroke solidifies

// Other gestures
export const FIST_RESET_MS = 1100;
export const THUMBSUP_MS   = 600;
export const DWELL_MS      = 1000;
export const CURSOR_R      = 22;

// Physics
export const GRAVITY_Y         = 2.0;
export const BALL_RESTITUTION  = 0.35;
export const BALL_FRICTION     = 0.05;
export const LINE_FRICTION     = 0.6;
export const LINE_RESTITUTION  = 0.15;
export const PLATFORM_FRICTION = 0.7;

// Win / fail
export const VICTORY_DIST = BALL_R * 2 + 4;
export const DEATH_Y      = GAME_H + 80;

// Stars (% ink remaining)
export const STAR3_THRESHOLD = 0.70;
export const STAR2_THRESHOLD = 0.30;
export const SCORE_PER_STAR  = 100;

export const TOTAL_LEVELS = 30;
