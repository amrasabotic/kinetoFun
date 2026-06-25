// Hex-grid bubble shooter logic

export const CANVAS_W   = 800;
export const CANVAS_H   = 560;
export const BUBBLE_R   = 18;
export const BUBBLE_D   = BUBBLE_R * 2;
export const ROW_H      = 31;           // vertical distance between row centers
export const WALL_L     = BUBBLE_R + 2;
export const WALL_R     = CANVAS_W - BUBBLE_R - 2;
export const GRID_TOP   = 28;           // y of row 0 center
export const SHOOTER_X  = CANVAS_W / 2;
export const SHOOTER_Y  = CANVAS_H - 52;
export const DANGER_Y   = CANVAS_H - 130;
export const SPEED      = 680;          // px/sec
export const SHOTS_PER_ROW = 8;        // shots before a new row is prepended
export const MAX_ROWS   = 14;

export const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4'] as const;
export type BubbleColor = (typeof COLORS)[number];

// How many colors active per level (increases with level)
export function activeColors(level: number): BubbleColor[] {
  const count = Math.min(3 + level, COLORS.length);
  return COLORS.slice(0, count) as BubbleColor[];
}

// Even row: 13 bubbles; odd row: 12 bubbles
export const EVEN_COLS = 13;
export const ODD_COLS  = 12;

export function cellX(row: number, col: number): number {
  const isEven = row % 2 === 0;
  const cols   = isEven ? EVEN_COLS : ODD_COLS;
  const totalW = cols * BUBBLE_D + (isEven ? 0 : BUBBLE_R);
  const startX = (CANVAS_W - totalW) / 2 + BUBBLE_R;
  return startX + col * BUBBLE_D;
}

export function cellY(row: number): number {
  return GRID_TOP + row * ROW_H;
}

export interface GridBubble {
  row: number;
  col: number;
  color: BubbleColor;
}

export interface FlyingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
}

export interface PopParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  life: number;   // 0→1 remaining life (1=fresh, 0=dead)
}

export type GamePhase = 'playing' | 'levelup' | 'gameover';

export interface GameState {
  phase: GamePhase;
  grid: GridBubble[];
  flying: FlyingBubble | null;
  nextColor: BubbleColor;
  shotCount: number;
  level: number;
  score: number;
  highScore: number;
  particles: PopParticle[];
  levelupTimer: number;  // ms remaining for levelup flash
}

export type GameEvent =
  | { type: 'shoot' }
  | { type: 'bounce' }
  | { type: 'pop'; count: number }
  | { type: 'levelup' }
  | { type: 'gameover' };

export interface UpdateResult {
  state: GameState;
  events: GameEvent[];
}

function randColor(level: number): BubbleColor {
  const ac = activeColors(level);
  return ac[Math.floor(Math.random() * ac.length)];
}

function buildRow(row: number, level: number): GridBubble[] {
  const isEven = row % 2 === 0;
  const cols   = isEven ? EVEN_COLS : ODD_COLS;
  const ac     = activeColors(level);
  return Array.from({ length: cols }, (_, col) => ({
    row,
    col,
    color: ac[Math.floor(Math.random() * ac.length)],
  }));
}

export function initialGameState(): GameState {
  const level = 1;
  // Seed 5 rows
  const grid: GridBubble[] = [];
  for (let r = 0; r < 5; r++) {
    grid.push(...buildRow(r, level));
  }
  return {
    phase: 'playing',
    grid,
    flying: null,
    nextColor: randColor(level),
    shotCount: 0,
    level,
    score: 0,
    highScore: 0,
    particles: [],
    levelupTimer: 0,
  };
}

export function restartGame(highScore: number): GameState {
  return { ...initialGameState(), highScore };
}

// Hex neighbors for (row, col)
function neighbors(row: number, col: number): [number, number][] {
  const isEven = row % 2 === 0;
  return [
    [row, col - 1], [row, col + 1],
    [row - 1, isEven ? col - 1 : col], [row - 1, isEven ? col : col + 1],
    [row + 1, isEven ? col - 1 : col], [row + 1, isEven ? col : col + 1],
  ];
}

function bfsMatch(grid: GridBubble[], row: number, col: number, color: BubbleColor): GridBubble[] {
  const key = (r: number, c: number) => `${r},${c}`;
  const map = new Map(grid.map(b => [key(b.row, b.col), b]));
  const visited = new Set<string>();
  const queue: [number, number][] = [[row, col]];
  const result: GridBubble[] = [];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const k = key(r, c);
    if (visited.has(k)) continue;
    visited.add(k);
    const b = map.get(k);
    if (!b || b.color !== color) continue;
    result.push(b);
    for (const [nr, nc] of neighbors(r, c)) queue.push([nr, nc]);
  }
  return result;
}

// Find floating bubbles (not connected to top row)
function floatingBubbles(grid: GridBubble[]): GridBubble[] {
  const key = (r: number, c: number) => `${r},${c}`;
  const map = new Map(grid.map(b => [key(b.row, b.col), b]));
  const anchored = new Set<string>();
  const queue: [number, number][] = grid
    .filter(b => b.row === 0)
    .map(b => [b.row, b.col] as [number, number]);
  for (const [r, c] of queue) anchored.add(key(r, c));
  // BFS from top
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    for (const [nr, nc] of neighbors(r, c)) {
      const k = key(nr, nc);
      if (!anchored.has(k) && map.has(k)) {
        anchored.add(k);
        queue.push([nr, nc]);
      }
    }
  }
  return grid.filter(b => !anchored.has(key(b.row, b.col)));
}

// Snap flying bubble to nearest empty grid cell
function snapToGrid(
  grid: GridBubble[],
  x: number,
  y: number,
): { row: number; col: number } | null {
  const occupied = new Set(grid.map(b => `${b.row},${b.col}`));
  let bestRow = -1, bestCol = -1, bestDist = Infinity;

  for (let r = 0; r < MAX_ROWS; r++) {
    const isEven = r % 2 === 0;
    const cols   = isEven ? EVEN_COLS : ODD_COLS;
    for (let c = 0; c < cols; c++) {
      if (occupied.has(`${r},${c}`)) continue;
      const cx = cellX(r, c);
      const cy = cellY(r);
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < bestDist) { bestDist = dist; bestRow = r; bestCol = c; }
    }
  }
  if (bestDist > BUBBLE_D * 1.5) return null;
  return { row: bestRow, col: bestCol };
}

export function shootBubble(gs: GameState, aimAngle: number): UpdateResult {
  if (gs.phase !== 'playing' || gs.flying) return { state: gs, events: [] };
  const s = { ...gs };
  s.flying = {
    x: SHOOTER_X,
    y: SHOOTER_Y,
    vx: Math.cos(aimAngle) * SPEED,
    vy: -Math.sin(aimAngle) * SPEED,
    color: s.nextColor,
  };
  s.nextColor = randColor(s.level);
  return { state: s, events: [{ type: 'shoot' }] };
}

export function updateGame(gs: GameState, delta: number): UpdateResult {
  if (gs.phase === 'gameover') return { state: gs, events: [] };
  if (gs.phase === 'levelup') {
    const s = { ...gs, levelupTimer: gs.levelupTimer - delta };
    if (s.levelupTimer <= 0) s.phase = 'playing';
    return { state: s, events: [] };
  }

  const events: GameEvent[] = [];
  let s = { ...gs };

  // Tick particles
  const PARTICLE_LIFE = 800; // ms
  s.particles = s.particles
    .map(p => ({
      ...p,
      x: p.x + p.vx * delta / 1000,
      y: p.y + p.vy * delta / 1000,
      vy: p.vy + 300 * delta / 1000,
      life: p.life - delta / PARTICLE_LIFE,
    }))
    .filter(p => p.life > 0);

  if (!s.flying) return { state: s, events };

  // Move flying bubble
  let { x, y, vx, vy, color } = s.flying;
  x += vx * delta / 1000;
  y += vy * delta / 1000;

  // Wall bounces
  if (x - BUBBLE_R < WALL_L) { x = WALL_L + BUBBLE_R; vx = Math.abs(vx); events.push({ type: 'bounce' }); }
  if (x + BUBBLE_R > WALL_R) { x = WALL_R - BUBBLE_R; vx = -Math.abs(vx); events.push({ type: 'bounce' }); }

  // Ceiling snap
  const hitCeiling = y - BUBBLE_R <= GRID_TOP - ROW_H / 2;

  // Check collision with any grid bubble
  let hitBubble = false;
  for (const b of s.grid) {
    const bx = cellX(b.row, b.col);
    const by = cellY(b.row);
    if (Math.hypot(x - bx, y - by) < BUBBLE_D - 2) {
      hitBubble = true;
      break;
    }
  }

  if (hitBubble || hitCeiling) {
    // Snap to grid
    const snap = snapToGrid(s.grid, x, y);
    if (snap) {
      const newBubble: GridBubble = { row: snap.row, col: snap.col, color };
      s.grid = [...s.grid, newBubble];
      s.flying = null;

      // Match check (BFS same-color)
      const matched = bfsMatch(s.grid, snap.row, snap.col, color);
      if (matched.length >= 3) {
        const matchSet = new Set(matched.map(b => `${b.row},${b.col}`));
        s.grid = s.grid.filter(b => !matchSet.has(`${b.row},${b.col}`));

        // Floating bubbles
        const floating = floatingBubbles(s.grid);
        const floatSet = new Set(floating.map(b => `${b.row},${b.col}`));
        s.grid = s.grid.filter(b => !floatSet.has(`${b.row},${b.col}`));

        const popped = matched.length + floating.length;
        events.push({ type: 'pop', count: popped });

        // Spawn particles
        const newParticles: PopParticle[] = [...matched, ...floating].map(b => {
          const px = cellX(b.row, b.col);
          const py = cellY(b.row);
          return Array.from({ length: 4 }, () => ({
            x: px, y: py,
            vx: (Math.random() - 0.5) * 200,
            vy: -(60 + Math.random() * 120),
            color: b.color,
            life: 1,
          }));
        }).flat();
        s.particles = [...s.particles, ...newParticles];

        // Scoring
        const base = matched.length === 3 ? 30 : matched.length === 4 ? 60 : 100 + (matched.length - 5) * 20;
        s.score += base + floating.length * 15;
      }

      // Count shot, maybe add new row
      s.shotCount += 1;
      if (s.shotCount % SHOTS_PER_ROW === 0) {
        // Prepend a new row: shift all existing rows down by 1
        s.grid = s.grid.map(b => ({ ...b, row: b.row + 1 }));
        const newRow = buildRow(0, s.level);
        s.grid = [...newRow, ...s.grid];
      }

      // Game over: any bubble below DANGER_Y
      const danger = s.grid.some(b => cellY(b.row) > DANGER_Y);
      if (danger) {
        s.phase = 'gameover';
        s.highScore = Math.max(s.score, s.highScore);
        events.push({ type: 'gameover' });
        return { state: s, events };
      }

      // Level up: clear all bubbles
      if (s.grid.length === 0) {
        s.level += 1;
        const newGrid: GridBubble[] = [];
        for (let r = 0; r < 5; r++) newGrid.push(...buildRow(r, s.level));
        s.grid = newGrid;
        s.shotCount = 0;
        s.phase = 'levelup';
        s.levelupTimer = 1800;
        events.push({ type: 'levelup' });
      }
    } else {
      // No snap found → drop
      s.flying = null;
    }
  } else {
    s.flying = { x, y, vx, vy, color };
  }

  return { state: s, events };
}
