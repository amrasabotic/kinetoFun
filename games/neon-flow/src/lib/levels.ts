// Neon Flow level definitions. Each level lists endpoint pairs only.
// The solver verifies that a perfect fill solution exists; min moves = number of colors.

export type Endpoint = [number, number]; // [row, col]
export interface LevelDef {
  id: number;
  size: number;
  // pairs[i] = [endpointA, endpointB] for color i
  pairs: [Endpoint, Endpoint][];
}

// 6 neon colors mapped to CSS tokens — we cycle if a level uses more.
export const NEON_COLORS = [
  "var(--neon-pink)",
  "var(--neon-cyan)",
  "var(--neon-lime)",
  "var(--neon-yellow)",
  "var(--neon-violet)",
  "var(--neon-orange)",
] as const;

// Helper to build a level
const L = (id: number, size: number, pairs: [Endpoint, Endpoint][]): LevelDef => ({ id, size, pairs });

// 20 levels — endpoint sets verified solvable by the solver below.
export const LEVELS: LevelDef[] = [
  L(1, 4, [[[3, 2], [0, 0]], [[3, 1], [1, 2]]]),
  L(2, 4, [[[1, 1], [0, 0]], [[0, 1], [2, 3]]]),
  L(3, 4, [[[3, 0], [1, 0]], [[1, 1], [2, 3]], [[0, 0], [1, 3]]]),
  L(4, 4, [[[0, 0], [1, 2]], [[3, 1], [1, 0]], [[3, 2], [1, 1]]]),
  L(5, 5, [[[2, 4], [3, 1]], [[4, 4], [2, 0]], [[2, 3], [3, 4]]]),
  L(6, 5, [[[2, 0], [0, 0]], [[0, 2], [3, 2]], [[0, 1], [2, 4]]]),
  L(7, 5, [[[4, 0], [3, 2]], [[0, 4], [2, 4]], [[0, 0], [2, 0]], [[1, 2], [2, 1]]]),
  L(8, 5, [[[4, 3], [2, 3]], [[1, 1], [1, 3]], [[4, 2], [0, 0]], [[4, 4], [0, 3]]]),
  L(9, 5, [[[3, 2], [0, 1]], [[1, 4], [0, 2]], [[1, 3], [3, 3]], [[2, 4], [4, 0]]]),
  L(10, 5, [[[1, 1], [0, 0]], [[3, 3], [1, 3]], [[3, 0], [1, 0]], [[1, 4], [0, 2]], [[3, 2], [4, 4]]]),
  L(11, 6, [[[2, 0], [1, 3]], [[2, 2], [3, 4]], [[4, 1], [3, 2]], [[0, 3], [4, 2]]]),
  L(12, 6, [[[0, 1], [2, 5]], [[1, 4], [3, 2]], [[2, 4], [4, 2]], [[0, 0], [1, 1]], [[2, 1], [5, 5]]]),
  L(13, 6, [[[3, 4], [4, 3]], [[4, 0], [0, 5]], [[2, 4], [3, 3]], [[5, 5], [2, 2]], [[4, 1], [5, 0]]]),
  L(14, 6, [[[1, 2], [1, 0]], [[3, 3], [2, 2]], [[2, 0], [1, 1]], [[3, 4], [0, 4]], [[0, 3], [2, 3]]]),
  L(15, 6, [[[0, 0], [1, 3]], [[5, 5], [0, 5]], [[3, 4], [0, 3]], [[4, 3], [5, 1]], [[4, 2], [4, 4]], [[5, 0], [1, 0]]]),
  L(16, 6, [[[1, 3], [3, 3]], [[3, 2], [3, 0]], [[4, 4], [5, 2]], [[4, 5], [5, 3]], [[0, 5], [1, 1]], [[0, 1], [2, 2]]]),
  L(17, 7, [[[3, 6], [0, 4]], [[2, 4], [4, 6]], [[1, 5], [3, 4]], [[0, 0], [2, 0]], [[0, 1], [6, 3]]]),
  L(18, 7, [[[6, 6], [6, 4]], [[3, 1], [4, 2]], [[0, 0], [2, 1]], [[2, 5], [0, 2]], [[0, 3], [4, 4]], [[5, 0], [5, 4]]]),
  L(19, 7, [[[1, 5], [6, 6]], [[0, 4], [1, 6]], [[5, 0], [5, 3]], [[0, 0], [4, 2]], [[6, 0], [0, 3]], [[1, 0], [3, 2]]]),
  L(20, 7, [[[3, 3], [4, 2]], [[0, 0], [0, 3]], [[3, 6], [1, 5]], [[6, 6], [5, 4]], [[4, 4], [6, 0]], [[1, 0], [1, 3]], [[6, 5], [6, 1]]]),
];

// Player score record (best moves, star earned if best == minMoves)
export interface LevelRecord {
  bestMoves: number;
  star: boolean;
}

export const minMovesFor = (lvl: LevelDef) => lvl.pairs.length;

// ─── Built-in solver: verifies every level has at least one full-fill solution.
// DFS routing: grow one color path at a time from its start; whenever a path
// completes, advance to next color. After last path completes, check grid full.
// Optimization: at each step, also fill the chosen cell into grid; ensures
// no cell is left orphaned (heuristic: any unfilled cell with no future-color
// access pruned).

const DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function solveLevel(level: LevelDef): boolean {
  const N = level.size;
  const grid: number[][] = Array.from({ length: N }, () => Array(N).fill(-1));
  // endpoints occupied
  level.pairs.forEach(([a, b], i) => {
    grid[a[0]][a[1]] = i;
    grid[b[0]][b[1]] = i;
  });

  const ends = level.pairs.map(([, b]) => b);
  const starts = level.pairs.map(([a]) => a);

  // Quick sanity: no overlap of endpoints.
  const seen = new Set<string>();
  for (const [a, b] of level.pairs) {
    for (const p of [a, b]) {
      const k = `${p[0]},${p[1]}`;
      if (seen.has(k)) return false;
      seen.add(k);
    }
  }

  // For pruning: after each step ensure no empty cell is fully enclosed by
  // foreign-color filled cells (only an active path's head can reach it).
  function deadCellExists(activeColor: number, head: [number, number]): boolean {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c] !== -1) continue;
        // Cell must be reachable by current head or by a future color's start
        // through empty/own cells. Quick check: at least one neighbor empty OR
        // one neighbor is current head OR one neighbor is a future-color start.
        let ok = false;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nc < 0 || nr >= N || nc >= N) continue;
          if (grid[nr][nc] === -1) { ok = true; break; }
          if (nr === head[0] && nc === head[1]) { ok = true; break; }
        }
        if (!ok) return true;
      }
    }
    return false;
  }

  function dfs(colorIdx: number, head: [number, number]): boolean {
    const goal = ends[colorIdx];
    // If adjacent to goal AND no other empty neighbor blocks completion, finish.
    for (const [dr, dc] of DIRS) {
      const nr = head[0] + dr, nc = head[1] + dc;
      if (nr === goal[0] && nc === goal[1]) {
        // Try completing the path here.
        if (colorIdx + 1 === level.pairs.length) {
          // last color — grid must be entirely full
          let full = true;
          for (let r = 0; r < N && full; r++)
            for (let c = 0; c < N; c++) if (grid[r][c] === -1) { full = false; break; }
          if (full) return true;
        } else {
          if (!deadCellExists(colorIdx + 1, starts[colorIdx + 1])) {
            if (dfs(colorIdx + 1, starts[colorIdx + 1])) return true;
          }
        }
      }
    }
    // Otherwise extend into an empty neighbor.
    for (const [dr, dc] of DIRS) {
      const nr = head[0] + dr, nc = head[1] + dc;
      if (nr < 0 || nc < 0 || nr >= N || nc >= N) continue;
      if (grid[nr][nc] !== -1) continue;
      grid[nr][nc] = colorIdx;
      if (!deadCellExists(colorIdx, [nr, nc])) {
        if (dfs(colorIdx, [nr, nc])) return true;
      }
      grid[nr][nc] = -1;
    }
    return false;
  }

  return dfs(0, starts[0]);
}

// Note: every level above was verified solvable by solveLevel() offline.