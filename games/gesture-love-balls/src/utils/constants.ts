export const GAME_W = 900;
export const GAME_H = 550;

export const BALL_R = 22;
export const LINE_W  = 14;   // drawn line half-thickness (physics body height)
export const MIN_DRAW_DIST = 8;  // px between sampled drawing points

// Pinch gesture
export const PINCH_THRESHOLD   = 0.07;   // normalised dist thumb-tip to index-tip
export const PINCH_CONFIRM_MS  = 140;    // must hold pinch this long to start drawing
export const PINCH_RELEASE_MS  = 80;     // must hold release this long to stop

// Fist / dwell
export const FIST_RESET_MS  = 1100;  // hold fist to reset
export const DWELL_MS       = 1000;  // hover dwell time for HUD buttons
export const CURSOR_R       = 22;

// Physics
export const GRAVITY_Y      = 2.0;   // matter-js gravity.y  (1 = earth-ish)
export const BALL_RESTITUTION  = 0.35;
export const BALL_FRICTION     = 0.05;
export const LINE_FRICTION     = 0.6;
export const LINE_RESTITUTION  = 0.15;
export const PLATFORM_FRICTION = 0.7;

// Victory
export const VICTORY_DIST   = BALL_R * 2 + 4;  // ball centres closer than this = win
export const DEATH_Y        = GAME_H + 80;

// Stars (based on ink remaining %)
export const STAR3_THRESHOLD = 0.70;  // 70 %+ remaining → 3 stars
export const STAR2_THRESHOLD = 0.30;  // 30–70 %         → 2 stars
// < 30 % → 1 star

// Score per star rating
export const SCORE_PER_STAR = 100;

export const TOTAL_LEVELS = 30;
