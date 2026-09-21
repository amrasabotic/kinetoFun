import type { Board, Move } from '../types';
import { applyMove, boardKey, isSolved, legalMoves } from '../systems/puzzleRules';

const MAX_EXPLORED_STATES = 120_000;

interface Node {
  board: Board;
  moves: Move[]; // the path taken to reach this node
  f: number; // moves.length + heuristic — the priority-queue key
}

/** Minimal binary min-heap keyed on `f`, since a plain sorted array would be too slow once the frontier grows into the thousands. */
class MinHeap {
  private items: Node[] = [];

  get size() {
    return this.items.length;
  }

  push(node: Node) {
    this.items.push(node);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].f <= this.items[i].f) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): Node | undefined {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let i = 0;
      const n = this.items.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < n && this.items[l].f < this.items[smallest].f) smallest = l;
        if (r < n && this.items[r].f < this.items[smallest].f) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

/**
 * How many more pours are at least needed: for each color, count the number
 * of separate same-color groups it's split across (adjacent same-color
 * units in one tube count as one group), summed over colors, minus the
 * number of colors already fully unified into one group. This under-counts
 * the true remaining distance (it ignores capacity/ordering constraints) so
 * it never overestimates — good enough to steer a greedy best-first search
 * toward the goal without the cost of a fully admissible heuristic.
 */
function heuristic(board: Board): number {
  const groupsByColor = new Map<number, number>();
  for (const tube of board) {
    let prev: number | null = null;
    for (const c of tube.colors) {
      if (c !== prev) groupsByColor.set(c, (groupsByColor.get(c) ?? 0) + 1);
      prev = c;
    }
  }
  let total = 0;
  for (const groups of groupsByColor.values()) total += groups - 1;
  return total;
}

/**
 * Pours onto ANY empty tube are strategically interchangeable — which
 * particular empty slot receives the color never affects solvability, only
 * how many symmetric copies of the same effective state the search wastes
 * budget exploring. With several empty tubes (common at higher levels),
 * `legalMoves` offers one such move per empty tube for every source, which
 * multiplies the branching factor with no real diversity. Collapsing them
 * to a single representative per source is what makes the larger boards in
 * this game's level range tractable at all within a fixed state budget.
 */
function movesForSolver(board: Board): Move[] {
  const seenEmptyDestFor = new Set<number>();
  const result: Move[] = [];
  for (const move of legalMoves(board)) {
    if (board[move.to].colors.length === 0) {
      if (seenEmptyDestFor.has(move.from)) continue;
      seenEmptyDestFor.add(move.from);
    }
    result.push(move);
  }
  return result;
}

// Weighting the heuristic above 1 sacrifices A*'s shortest-path guarantee
// (already given up by the empty-tube collapsing above anyway) in exchange
// for a much greedier, much faster search — the only property this solver
// actually needs, since it's used for hints/pars/generation-verification,
// never to prove a board unsolvable.
const HEURISTIC_WEIGHT = 3;

/**
 * Heuristic-guided best-first search (weighted-A*-style: expand lowest
 * g+W*h first) over the puzzle's state graph. Used only for in-game hints
 * and the "par" used to grade stars, and by the generator to verify a dealt
 * board is solvable — level generation's correctness never depends on this
 * search succeeding (see puzzleGenerator.ts's doc comment), so a board that
 * exceeds the budget is simply "no hint available right now" or "try
 * another deal," never treated as a proof of unsolvability.
 */
function solve(board: Board, budget: number): Move[] | null {
  if (isSolved(board)) return null;

  const visited = new Set<string>([boardKey(board)]);
  const heap = new MinHeap();
  heap.push({ board, moves: [], f: heuristic(board) * HEURISTIC_WEIGHT });
  let explored = 0;

  while (heap.size > 0 && explored < budget) {
    const node = heap.pop();
    if (!node) break;

    for (const move of movesForSolver(node.board)) {
      const child = applyMove(node.board, move);
      const key = boardKey(child);
      if (visited.has(key)) continue;
      visited.add(key);
      explored++;

      const moves = [...node.moves, move];
      if (isSolved(child)) return moves;

      heap.push({ board: child, moves, f: moves.length + heuristic(child) * HEURISTIC_WEIGHT });
      if (explored >= budget) break;
    }
  }

  return null;
}

/** The next move toward a solution, or null if the board is already solved or none was found within budget. */
export function findHint(board: Board): Move | null {
  return solve(board, MAX_EXPLORED_STATES)?.[0] ?? null;
}

/** A solution's move count (not always provably shortest — see solve's doc comment), used as "par" for star grading. Null if none was found within budget. */
export function optimalMoveCount(board: Board): number | null {
  return solve(board, MAX_EXPLORED_STATES)?.length ?? null;
}

/**
 * The full move sequence of a found solution. Accepts an optional smaller
 * `budget` — used by the generator (utils/puzzleGenerator.ts) to verify a
 * freshly-dealt board *quickly*, since trying many small-budget searches
 * across fresh random deals finds a solvable board faster in aggregate than
 * exhausting the full hint-quality budget on each unlucky deal in turn.
 */
export function solvePath(board: Board, budget: number = MAX_EXPLORED_STATES): Move[] | null {
  return solve(board, budget);
}
