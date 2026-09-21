import type { Direction, Enemy, EnemyKind, GridPos, Maze, Player } from '../types/GameTypes';
import {
  ALL_DIRS,
  DIR_VECTOR,
  OPPOSITE,
  TURN_LEFT,
  TURN_RIGHT,
  bfsFirstStep,
  isAtCellCenter,
  isOpen,
  manhattan,
  stepCell,
} from '../utils/grid';

const ENEMY_COLORS: Record<EnemyKind, string> = {
  chaser: '#ff3b3b',
  ambusher: '#ff9f3b',
  patroller: '#b26bff',
  hunter: '#3bd6ff',
};

export const ENEMY_LABELS: Record<EnemyKind, string> = {
  chaser: 'Chaser Drone',
  ambusher: 'Ambush Bot',
  patroller: 'Patrol Sentinel',
  hunter: 'Rogue Hunter',
};

let nextId = 1;

export function createEnemy(kind: EnemyKind, home: GridPos, speed: number): Enemy {
  return {
    id: nextId++,
    kind,
    col: home.col,
    row: home.row,
    dir: 'up',
    desiredDir: null,
    mode: 'normal',
    speed,
    patrolIndex: 0,
    color: ENEMY_COLORS[kind],
  };
}

function openNonReverseDirs(maze: Maze, col: number, row: number, dir: Direction): Direction[] {
  const opts = ALL_DIRS.filter((d) => isOpen(maze, col, row, d));
  const nonReverse = opts.filter((d) => d !== OPPOSITE[dir]);
  return nonReverse.length > 0 ? nonReverse : opts;
}

function cellPos(e: Enemy): GridPos {
  return { col: Math.round(e.col), row: Math.round(e.row) };
}

// ── Per-kind decision logic — called only when the enemy is centered in a
// cell (so decisions always resolve to a wall-legal direction). ────────────

function decideChaser(maze: Maze, at: GridPos, player: Player): Direction {
  const step = bfsFirstStep(maze, at, { col: Math.round(player.col), row: Math.round(player.row) });
  return step ?? openNonReverseDirs(maze, at.col, at.row, 'up')[0];
}

function decideAmbusher(maze: Maze, at: GridPos, player: Player): Direction {
  const lookAhead = 4;
  const v = DIR_VECTOR[player.dir];
  let target: GridPos = { col: Math.round(player.col), row: Math.round(player.row) };
  for (let i = 1; i <= lookAhead; i++) {
    const candidate = { col: target.col + v.col, row: target.row + v.row };
    if (candidate.row < 0 || candidate.row >= maze.rows || candidate.col < 0 || candidate.col >= maze.cols) break;
    target = candidate;
  }
  const step = bfsFirstStep(maze, at, target) ?? bfsFirstStep(maze, at, { col: Math.round(player.col), row: Math.round(player.row) });
  return step ?? openNonReverseDirs(maze, at.col, at.row, 'up')[0];
}

/** Right-hand wall-follower — traces a deterministic repeating loop, feels like a fixed patrol route. */
function decidePatroller(maze: Maze, at: GridPos, dir: Direction): Direction {
  const priority = [TURN_RIGHT[dir], dir, TURN_LEFT[dir], OPPOSITE[dir]];
  for (const d of priority) {
    if (isOpen(maze, at.col, at.row, d)) return d;
  }
  return dir;
}

function decideHunter(maze: Maze, at: GridPos, dir: Direction, player: Player): Direction {
  const opts = openNonReverseDirs(maze, at.col, at.row, dir);
  if (opts.length === 1) return opts[0];
  if (Math.random() < 0.35) {
    const playerCell = { col: Math.round(player.col), row: Math.round(player.row) };
    let best = opts[0];
    let bestDist = Infinity;
    for (const d of opts) {
      const next = stepCell(maze, at.col, at.row, d);
      const dist = manhattan(next, playerCell);
      if (dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  }
  return opts[Math.floor(Math.random() * opts.length)];
}

function decideFrightened(maze: Maze, at: GridPos, dir: Direction, player: Player): Direction {
  const opts = openNonReverseDirs(maze, at.col, at.row, dir);
  const playerCell = { col: Math.round(player.col), row: Math.round(player.row) };
  let best = opts[0];
  let bestDist = -1;
  for (const d of opts) {
    const next = stepCell(maze, at.col, at.row, d);
    const dist = manhattan(next, playerCell);
    if (dist > bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}

export interface EnemyUpdateCtx {
  maze: Maze;
  player: Player;
  dt: number;
  frightenedSpeedMult: number;
  eatenSpeedMult: number;
}

export function updateEnemy(e: Enemy, ctx: EnemyUpdateCtx): void {
  const { maze, player, dt } = ctx;

  if (e.mode === 'eaten') {
    const at = cellPos(e);
    if (isAtCellCenter(e.col) && isAtCellCenter(e.row)) {
      if (at.col === maze.enemyHome.col && at.row === maze.enemyHome.row) {
        e.mode = 'normal';
        e.dir = 'up';
        return;
      }
      const step = bfsFirstStep(maze, at, maze.enemyHome);
      e.dir = step ?? e.dir;
    }
  } else if (isAtCellCenter(e.col) && isAtCellCenter(e.row)) {
    const at = cellPos(e);
    e.col = at.col;
    e.row = at.row;
    if (e.mode === 'frightened') {
      e.dir = decideFrightened(maze, at, e.dir, player);
    } else {
      switch (e.kind) {
        case 'chaser':
          e.dir = decideChaser(maze, at, player);
          break;
        case 'ambusher':
          e.dir = decideAmbusher(maze, at, player);
          break;
        case 'patroller':
          e.dir = decidePatroller(maze, at, e.dir);
          break;
        case 'hunter':
          e.dir = decideHunter(maze, at, e.dir, player);
          break;
      }
    }
  }

  const speedMult = e.mode === 'eaten' ? ctx.eatenSpeedMult : e.mode === 'frightened' ? ctx.frightenedSpeedMult : 1;
  const v = DIR_VECTOR[e.dir];
  if (!isOpen(maze, Math.round(e.col), Math.round(e.row), e.dir) && isAtCellCenter(e.col) && isAtCellCenter(e.row)) {
    return; // boxed in for this frame (shouldn't normally happen — decision fns always pick an open dir)
  }
  e.col += v.col * e.speed * speedMult * dt;
  e.row += v.row * e.speed * speedMult * dt;

  // Warp wrap-around.
  if (e.row === maze.warpRow || Math.round(e.row) === maze.warpRow) {
    if (e.col < -0.5) e.col = maze.cols - 0.5;
    if (e.col > maze.cols - 0.5) e.col = -0.5;
  }
}

export function setFrightened(enemies: Enemy[]): void {
  for (const e of enemies) {
    if (e.mode === 'eaten') continue;
    e.mode = 'frightened';
    e.dir = OPPOSITE[e.dir];
  }
}

export function clearFrightened(enemies: Enemy[]): void {
  for (const e of enemies) {
    if (e.mode === 'frightened') e.mode = 'normal';
  }
}
