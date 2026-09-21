export interface BallDef {
  x: number; y: number;
  color: 'blue' | 'pink';
}

export interface PlatformDef {
  x: number; y: number;
  w: number; h: number;
  angle?: number;   // degrees
  type?: 'normal' | 'spike' | 'bouncer';
  color?: string;
}

export interface MovingBlockDef {
  x: number; y: number;
  w: number; h: number;
  axis: 'x' | 'y';
  range: number;    // pixels each direction from start
  period: number;   // ms for full cycle
  phase?: number;   // 0-1
}

export interface RotatingBeamDef {
  x: number; y: number;
  w: number; h: number;
  speed: number;      // degrees/second
  startAngle?: number;
}

export interface LevelDef {
  id: number;
  name: string;
  hint: string;
  gravity?: number;
  balls: BallDef[];
  platforms?: PlatformDef[];
  spikes?: PlatformDef[];
  movingBlocks?: MovingBlockDef[];
  rotatingBeams?: RotatingBeamDef[];
  inkLimit: number;
}

export const LEVELS: LevelDef[] = [
  // ── 1–5  Easy ────────────────────────────────────────────────────────────────
  {
    id: 1, name: 'First Hello', hint: 'Draw a bridge across the gap!',
    balls: [{ x: 120, y: 340, color: 'blue' }, { x: 780, y: 340, color: 'pink' }],
    platforms: [
      { x: 0,   y: 360, w: 270, h: 20 },
      { x: 630, y: 360, w: 270, h: 20 },
    ],
    inkLimit: 620,
  },
  {
    id: 2, name: 'Downhill', hint: 'Draw a ramp from high to low!',
    balls: [{ x: 110, y: 160, color: 'blue' }, { x: 790, y: 400, color: 'pink' }],
    platforms: [
      { x: 0,   y: 180, w: 230, h: 18 },
      { x: 670, y: 420, w: 230, h: 18 },
      { x: 420, y: 100, w: 18,  h: 340 },  // center wall
    ],
    inkLimit: 520,
  },
  {
    id: 3, name: 'The Wall', hint: 'Draw over the wall!',
    balls: [{ x: 160, y: 440, color: 'blue' }, { x: 740, y: 440, color: 'pink' }],
    platforms: [
      { x: 0,   y: 460, w: 900, h: 20 },  // full floor
      { x: 425, y: 130, w: 28,  h: 340 }, // tall center wall
    ],
    inkLimit: 500,
  },
  {
    id: 4, name: 'Step Down', hint: 'Connect the steps to make a slide!',
    balls: [{ x: 80,  y: 110, color: 'blue' }, { x: 820, y: 440, color: 'pink' }],
    platforms: [
      { x: 0,   y: 130, w: 200, h: 18 },
      { x: 250, y: 230, w: 180, h: 18 },
      { x: 470, y: 330, w: 180, h: 18 },
      { x: 700, y: 460, w: 200, h: 18 },
    ],
    inkLimit: 490,
  },
  {
    id: 5, name: 'Twin Drop', hint: 'Guide both balls into the bowl!',
    balls: [{ x: 140, y: 110, color: 'blue' }, { x: 760, y: 110, color: 'pink' }],
    platforms: [
      { x: 0,   y: 130, w: 220, h: 18 },
      { x: 680, y: 130, w: 220, h: 18 },
      { x: 290, y: 360, w: 20,  h: 150 }, // bowl left wall
      { x: 590, y: 360, w: 20,  h: 150 }, // bowl right wall
      { x: 290, y: 360, w: 320, h: 18 },  // bowl floor
    ],
    inkLimit: 580,
  },

  // ── 6–10  Medium ─────────────────────────────────────────────────────────────
  {
    id: 6, name: 'Wide Canyon', hint: 'Build a long bridge!',
    balls: [{ x: 90,  y: 310, color: 'blue' }, { x: 810, y: 310, color: 'pink' }],
    platforms: [
      { x: 0,   y: 330, w: 190, h: 18 },
      { x: 710, y: 330, w: 190, h: 18 },
    ],
    spikes: [{ x: 200, y: 515, w: 500, h: 25 }],
    inkLimit: 730,
  },
  {
    id: 7, name: 'Staircase', hint: 'Connect the descending steps!',
    balls: [{ x: 70,  y: 100, color: 'blue' }, { x: 830, y: 430, color: 'pink' }],
    platforms: [
      { x: 0,   y: 120, w: 180, h: 18 },
      { x: 180, y: 200, w: 180, h: 18 },
      { x: 360, y: 300, w: 180, h: 18 },
      { x: 540, y: 380, w: 180, h: 18 },
      { x: 720, y: 450, w: 180, h: 18 },
    ],
    inkLimit: 510,
  },
  {
    id: 8, name: 'The Maze', hint: 'Find a way through the walls!',
    balls: [{ x: 80,  y: 80,  color: 'blue' }, { x: 820, y: 460, color: 'pink' }],
    platforms: [
      { x: 0,   y: 100, w: 170, h: 18 },
      { x: 730, y: 480, w: 170, h: 18 },
      { x: 170, y: 100, w: 18,  h: 220 },
      { x: 170, y: 300, w: 260, h: 18 },
      { x: 430, y: 150, w: 18,  h: 170 },
      { x: 430, y: 150, w: 200, h: 18 },
      { x: 630, y: 150, w: 18,  h: 250 },
      { x: 370, y: 380, w: 260, h: 18 },
      { x: 370, y: 380, w: 18,  h: 130 },
    ],
    inkLimit: 560,
  },
  {
    id: 9, name: 'High & Low', hint: 'Bridge across different heights!',
    balls: [{ x: 80,  y: 80,  color: 'blue' }, { x: 820, y: 450, color: 'pink' }],
    platforms: [
      { x: 0,   y: 100, w: 200, h: 18 },
      { x: 700, y: 470, w: 200, h: 18 },
      { x: 290, y: 250, w: 150, h: 18 },
      { x: 460, y: 350, w: 150, h: 18 },
    ],
    inkLimit: 540,
  },
  {
    id: 10, name: 'Zigzag', hint: 'Draw along the winding path!',
    balls: [{ x: 80,  y: 80,  color: 'blue' }, { x: 820, y: 460, color: 'pink' }],
    platforms: [
      { x: 0,   y: 100, w: 170, h: 18 },
      { x: 730, y: 480, w: 170, h: 18 },
      { x: 200, y: 200, w: 200, h: 18 },
      { x: 170, y: 200, w: 18,  h: 160 },
      { x: 400, y: 100, w: 18,  h: 120 },
      { x: 400, y: 100, w: 180, h: 18 },
      { x: 500, y: 300, w: 200, h: 18 },
      { x: 700, y: 300, w: 18,  h: 200 },
    ],
    inkLimit: 600,
  },

  // ── 11–15  Moving obstacles ──────────────────────────────────────────────────
  {
    id: 11, name: 'Moving Bridge', hint: 'Catch the moving platform!',
    balls: [{ x: 90,  y: 100, color: 'blue' }, { x: 810, y: 450, color: 'pink' }],
    platforms: [
      { x: 0,   y: 120, w: 190, h: 18 },
      { x: 710, y: 470, w: 190, h: 18 },
    ],
    movingBlocks: [
      { x: 380, y: 270, w: 160, h: 18, axis: 'x', range: 130, period: 2400, phase: 0 },
    ],
    inkLimit: 500,
  },
  {
    id: 12, name: 'Pendulum', hint: 'Time your move between swings!',
    balls: [{ x: 120, y: 440, color: 'blue' }, { x: 780, y: 440, color: 'pink' }],
    platforms: [
      { x: 0,   y: 460, w: 340, h: 18 },
      { x: 560, y: 460, w: 340, h: 18 },
      { x: 431, y: 0,   w: 38,  h: 60 },
    ],
    movingBlocks: [
      { x: 440, y: 240, w: 18, h: 200, axis: 'x', range: 160, period: 1900, phase: 0 },
    ],
    inkLimit: 530,
  },
  {
    id: 13, name: 'Elevator', hint: 'Ride the elevator up!',
    balls: [{ x: 80,  y: 450, color: 'blue' }, { x: 820, y: 90,  color: 'pink' }],
    platforms: [
      { x: 0,   y: 470, w: 190, h: 18 },
      { x: 710, y: 110, w: 190, h: 18 },
      { x: 295, y: 0,   w: 18,  h: 540 }, // shaft left
      { x: 587, y: 0,   w: 18,  h: 540 }, // shaft right
    ],
    movingBlocks: [
      { x: 350, y: 360, w: 200, h: 18, axis: 'y', range: 200, period: 3200, phase: 0 },
    ],
    inkLimit: 490,
  },
  {
    id: 14, name: 'Spinning Gate', hint: 'Pass through the rotating gap!',
    balls: [{ x: 100, y: 180, color: 'blue' }, { x: 800, y: 440, color: 'pink' }],
    platforms: [
      { x: 0,   y: 200, w: 210, h: 18 },
      { x: 690, y: 460, w: 210, h: 18 },
      { x: 0,   y: 530, w: 900, h: 18 },
    ],
    rotatingBeams: [
      { x: 450, y: 320, w: 170, h: 16, speed: 55, startAngle: 0 },
    ],
    inkLimit: 510,
  },
  {
    id: 15, name: 'Double Move', hint: 'Two moving walls — time carefully!',
    balls: [{ x: 80,  y: 100, color: 'blue' }, { x: 820, y: 100, color: 'pink' }],
    platforms: [
      { x: 0,   y: 120, w: 160, h: 18 },
      { x: 740, y: 120, w: 160, h: 18 },
      { x: 0,   y: 530, w: 900, h: 18 },
    ],
    movingBlocks: [
      { x: 280, y: 300, w: 140, h: 18, axis: 'y', range: 130, period: 2100, phase: 0.0 },
      { x: 580, y: 300, w: 140, h: 18, axis: 'y', range: 130, period: 2100, phase: 0.5 },
    ],
    inkLimit: 530,
  },

  // ── 16–20  Complex physics ───────────────────────────────────────────────────
  {
    id: 16, name: 'Spike Canyon', hint: 'Bridge the gap — spikes below!',
    balls: [{ x: 90,  y: 90,  color: 'blue' }, { x: 810, y: 90,  color: 'pink' }],
    platforms: [
      { x: 0,   y: 110, w: 190, h: 18 },
      { x: 710, y: 110, w: 190, h: 18 },
      { x: 190, y: 340, w: 80,  h: 18 },
      { x: 630, y: 340, w: 80,  h: 18 },
    ],
    spikes: [{ x: 270, y: 510, w: 360, h: 28 }],
    inkLimit: 720,
  },
  {
    id: 17, name: 'Chamber', hint: 'Navigate the inner corridors!',
    balls: [{ x: 80,  y: 80,  color: 'blue' }, { x: 820, y: 450, color: 'pink' }],
    platforms: [
      { x: 0,   y: 100, w: 170, h: 18 },
      { x: 730, y: 470, w: 170, h: 18 },
      { x: 170, y: 100, w: 360, h: 18 },  // top divider
      { x: 530, y: 250, w: 200, h: 18 },  // right middle
      { x: 170, y: 400, w: 360, h: 18 },  // bottom divider
      { x: 170, y: 100, w: 18,  h: 320 }, // left inner wall
      { x: 530, y: 250, w: 18,  h: 170 }, // right inner wall down
    ],
    inkLimit: 570,
  },
  {
    id: 18, name: 'Stacker', hint: 'Stack and bridge across!',
    balls: [{ x: 80,  y: 440, color: 'blue' }, { x: 820, y: 440, color: 'pink' }],
    platforms: [
      { x: 0,   y: 460, w: 160, h: 18 },
      { x: 740, y: 460, w: 160, h: 18 },
      { x: 165, y: 320, w: 130, h: 18 },
      { x: 360, y: 200, w: 180, h: 18 },
      { x: 605, y: 320, w: 130, h: 18 },
    ],
    inkLimit: 660,
  },
  {
    id: 19, name: 'Pinball Drop', hint: 'Bounce through the walls!',
    balls: [{ x: 440, y: 70,  color: 'blue' }, { x: 440, y: 460, color: 'pink' }],
    platforms: [
      { x: 340, y: 90,  w: 220, h: 18 },  // top platform
      { x: 340, y: 480, w: 220, h: 18 },  // bottom platform
      { x: 180, y: 140, w: 18,  h: 300 }, // left wall
      { x: 702, y: 140, w: 18,  h: 300 }, // right wall
      { x: 180, y: 140, w: 210, h: 18 },  // left crossbar
      { x: 510, y: 280, w: 210, h: 18 },  // right crossbar
    ],
    inkLimit: 510,
  },
  {
    id: 20, name: 'Counterweight', hint: 'Use gravity to flip the seesaw!',
    balls: [{ x: 110, y: 90,  color: 'blue' }, { x: 790, y: 430, color: 'pink' }],
    platforms: [
      { x: 0,   y: 110, w: 200, h: 18 },
      { x: 700, y: 450, w: 200, h: 18 },
      { x: 330, y: 260, w: 240, h: 18 },  // balance beam
      { x: 437, y: 260, w: 26,  h: 110 }, // fulcrum
    ],
    movingBlocks: [
      { x: 450, y: 180, w: 110, h: 18, axis: 'y', range: 70, period: 2200, phase: 0.25 },
    ],
    inkLimit: 520,
  },

  // ── 21–25  Expert timing ─────────────────────────────────────────────────────
  {
    id: 21, name: 'Maze Runner', hint: 'Weave through the labyrinth!',
    balls: [{ x: 70,  y: 70,  color: 'blue' }, { x: 830, y: 470, color: 'pink' }],
    platforms: [
      { x: 0,   y: 90,  w: 155, h: 18 },
      { x: 745, y: 490, w: 155, h: 18 },
      { x: 155, y: 90,  w: 18,  h: 220 },
      { x: 155, y: 290, w: 270, h: 18 },
      { x: 425, y: 150, w: 18,  h: 160 },
      { x: 255, y: 150, w: 190, h: 18 },
      { x: 620, y: 150, w: 18,  h: 230 },
      { x: 385, y: 380, w: 18,  h: 130 },
      { x: 385, y: 380, w: 210, h: 18 },
      { x: 595, y: 380, w: 18,  h: 130 },
      { x: 210, y: 450, w: 185, h: 18 },
    ],
    inkLimit: 600,
  },
  {
    id: 22, name: 'Timing Gates', hint: 'Thread through the moving slots!',
    balls: [{ x: 80,  y: 100, color: 'blue' }, { x: 820, y: 440, color: 'pink' }],
    platforms: [
      { x: 0,   y: 120, w: 170, h: 18 },
      { x: 730, y: 460, w: 170, h: 18 },
      { x: 0,   y: 530, w: 900, h: 18 },
    ],
    movingBlocks: [
      { x: 270, y: 290, w: 18, h: 160, axis: 'y', range: 90, period: 1700, phase: 0.0 },
      { x: 450, y: 240, w: 18, h: 180, axis: 'y', range: 110, period: 2100, phase: 0.33 },
      { x: 630, y: 290, w: 18, h: 160, axis: 'y', range: 90, period: 1500, phase: 0.66 },
    ],
    inkLimit: 560,
  },
  {
    id: 23, name: 'Three Floors', hint: 'Connect all three levels!',
    balls: [{ x: 70,  y: 70,  color: 'blue' }, { x: 830, y: 460, color: 'pink' }],
    platforms: [
      { x: 0,   y: 90,  w: 160, h: 18 },
      { x: 740, y: 480, w: 160, h: 18 },
      // Inner frame
      { x: 190, y: 90,  w: 18,  h: 450 },  // left inner
      { x: 692, y: 90,  w: 18,  h: 450 },  // right inner
      { x: 190, y: 240, w: 502, h: 18 },   // mid divider
      { x: 190, y: 390, w: 502, h: 18 },   // lower divider
    ],
    inkLimit: 660,
  },
  {
    id: 24, name: 'Pinwheel', hint: 'Dodge the spinning beams!',
    balls: [{ x: 80,  y: 90,  color: 'blue' }, { x: 820, y: 90,  color: 'pink' }],
    platforms: [
      { x: 0,   y: 110, w: 160, h: 18 },
      { x: 740, y: 110, w: 160, h: 18 },
      { x: 0,   y: 530, w: 900, h: 18 },
    ],
    rotatingBeams: [
      { x: 300, y: 310, w: 170, h: 16, speed:  60, startAngle:  0 },
      { x: 600, y: 310, w: 170, h: 16, speed: -60, startAngle: 90 },
    ],
    inkLimit: 560,
  },
  {
    id: 25, name: 'Spike Alley', hint: 'Fly over the spikes!',
    balls: [{ x: 80,  y: 90,  color: 'blue' }, { x: 820, y: 90,  color: 'pink' }],
    platforms: [
      { x: 0,   y: 110, w: 160, h: 18 },
      { x: 740, y: 110, w: 160, h: 18 },
      { x: 230, y: 220, w: 130, h: 18 },
      { x: 540, y: 220, w: 130, h: 18 },
      { x: 335, y: 110, w: 18,  h: 180 },
      { x: 547, y: 110, w: 18,  h: 180 },
    ],
    spikes: [{ x: 0, y: 490, w: 900, h: 30 }],
    inkLimit: 560,
  },

  // ── 26–30  Master ────────────────────────────────────────────────────────────
  {
    id: 26, name: 'The Labyrinth', hint: 'Complex maze — plan your route!',
    balls: [{ x: 55,  y: 55,  color: 'blue' }, { x: 845, y: 485, color: 'pink' }],
    platforms: [
      { x: 0,   y: 75,  w: 130, h: 18 },
      { x: 770, y: 505, w: 130, h: 18 },
      { x: 130, y: 75,  w: 18,  h: 260 },
      { x: 130, y: 315, w: 220, h: 18 },
      { x: 330, y: 160, w: 18,  h: 175 },
      { x: 230, y: 160, w: 120, h: 18 },
      { x: 330, y: 315, w: 210, h: 18 },
      { x: 540, y: 210, w: 18,  h: 125 },
      { x: 440, y: 210, w: 120, h: 18 },
      { x: 540, y: 355, w: 18,  h: 160 },
      { x: 630, y: 210, w: 18,  h: 260 },
      { x: 540, y: 450, w: 210, h: 18 },
      { x: 730, y: 310, w: 18,  h: 160 },
      { x: 640, y: 310, w: 110, h: 18 },
    ],
    inkLimit: 620,
  },
  {
    id: 27, name: 'Ricochet', hint: 'Chain the bounces!',
    balls: [{ x: 80,  y: 90,  color: 'blue' }, { x: 820, y: 450, color: 'pink' }],
    platforms: [
      { x: 0,   y: 110, w: 160, h: 18 },
      { x: 740, y: 470, w: 160, h: 18 },
      { x: 190, y: 210, w: 130, h: 18, angle: -18 },
      { x: 400, y: 315, w: 130, h: 18, angle:  18 },
      { x: 580, y: 400, w: 130, h: 18, angle: -12 },
    ],
    movingBlocks: [
      { x: 330, y: 155, w: 110, h: 18, axis: 'x', range: 65, period: 2000, phase: 0 },
    ],
    inkLimit: 560,
  },
  {
    id: 28, name: 'Dynamic Maze', hint: 'Navigate the moving obstacles!',
    balls: [{ x: 80,  y: 80,  color: 'blue' }, { x: 820, y: 450, color: 'pink' }],
    platforms: [
      { x: 0,   y: 100, w: 160, h: 18 },
      { x: 740, y: 470, w: 160, h: 18 },
    ],
    movingBlocks: [
      { x: 275, y: 180, w: 18, h: 210, axis: 'y', range: 90, period: 1600, phase: 0.0 },
      { x: 445, y: 290, w: 170, h: 18, axis: 'x', range: 100, period: 2000, phase: 0.25 },
      { x: 625, y: 200, w: 18, h: 190, axis: 'y', range: 90, period: 1800, phase: 0.5 },
    ],
    rotatingBeams: [
      { x: 450, y: 150, w: 130, h: 16, speed: 45, startAngle: 0 },
    ],
    spikes: [{ x: 0, y: 520, w: 900, h: 20 }],
    inkLimit: 610,
  },
  {
    id: 29, name: 'Chaos Theory', hint: 'Find order in the chaos!',
    balls: [{ x: 80,  y: 440, color: 'blue' }, { x: 820, y: 90, color: 'pink' }],
    platforms: [
      { x: 0,   y: 460, w: 160, h: 18 },
      { x: 740, y: 110, w: 160, h: 18 },
    ],
    movingBlocks: [
      { x: 245, y: 250, w: 110, h: 18, axis: 'x', range: 85, period: 1800, phase: 0.0 },
      { x: 450, y: 180, w: 110, h: 18, axis: 'y', range: 105, period: 2200, phase: 0.2 },
      { x: 650, y: 330, w: 110, h: 18, axis: 'x', range: 75, period: 1500, phase: 0.4 },
    ],
    rotatingBeams: [
      { x: 360, y: 370, w: 170, h: 16, speed:  65, startAngle: 40 },
      { x: 570, y: 260, w: 110, h: 16, speed: -50, startAngle: 90 },
    ],
    spikes: [
      { x: 200, y: 520, w: 310, h: 20 },
      { x: 600, y: 100, w: 210, h: 20 },
    ],
    inkLimit: 710,
  },
  {
    id: 30, name: 'Grand Finale', hint: 'The ultimate reunion — all obstacles!',
    balls: [{ x: 80,  y: 80,  color: 'blue' }, { x: 820, y: 450, color: 'pink' }],
    platforms: [
      { x: 0,   y: 100, w: 160, h: 18 },
      { x: 740, y: 470, w: 160, h: 18 },
      { x: 290, y: 220, w: 320, h: 18 },
      { x: 160, y: 0,   w: 18,  h: 220 },
      { x: 722, y: 220, w: 18,  h: 360 },
    ],
    movingBlocks: [
      { x: 255, y: 340, w: 130, h: 18, axis: 'x', range: 105, period: 2000, phase: 0.0 },
      { x: 600, y: 160, w: 18,  h: 110, axis: 'y', range: 85, period: 1800, phase: 0.3 },
    ],
    rotatingBeams: [
      { x: 450, y: 370, w: 190, h: 16, speed: 50, startAngle: 25 },
    ],
    spikes: [{ x: 350, y: 520, w: 200, h: 22 }],
    inkLimit: 760,
  },
];

export function getLevel(id: number): LevelDef {
  return LEVELS.find(l => l.id === id) ?? LEVELS[0];
}
