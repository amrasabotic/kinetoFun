import type { Board, Move, Tube } from '../types';
import { TUBE_CAPACITY } from '../types';

export function topColor(tube: Tube): number | null {
  return tube.colors.length > 0 ? tube.colors[tube.colors.length - 1] : null;
}

/** How many consecutive same-color units sit on top of a tube — a pour always moves the whole top run (as much as fits). */
export function topRunLength(tube: Tube): number {
  const c = tube.colors;
  if (c.length === 0) return 0;
  const top = c[c.length - 1];
  let n = 0;
  for (let i = c.length - 1; i >= 0 && c[i] === top; i--) n++;
  return n;
}

/** A pour is legal only if the destination is empty, or its top color matches the source's top color, and it has room. */
export function isMoveLegal(board: Board, move: Move): boolean {
  if (move.from === move.to) return false;
  const src = board[move.from];
  const dst = board[move.to];
  if (!src || !dst) return false;
  if (src.colors.length === 0) return false;
  if (dst.colors.length >= TUBE_CAPACITY) return false;
  const dstTop = topColor(dst);
  const srcTop = topColor(src);
  return dstTop === null || dstTop === srcTop;
}

/** Applies a pour, moving the source's whole top run (capped by destination space). Returns the board unchanged if the move is illegal. */
export function applyMove(board: Board, move: Move): Board {
  if (!isMoveLegal(board, move)) return board;
  const next = board.map((t) => ({ colors: [...t.colors] }));
  const src = next[move.from];
  const dst = next[move.to];
  const color = src.colors[src.colors.length - 1];
  const spaceLeft = TUBE_CAPACITY - dst.colors.length;
  let poured = 0;
  while (poured < spaceLeft && src.colors.length > 0 && src.colors[src.colors.length - 1] === color) {
    src.colors.pop();
    dst.colors.push(color);
    poured++;
  }
  return next;
}

/** How many units would actually move for a given (legal) pour — used to size the pour animation. */
export function pourAmount(board: Board, move: Move): number {
  if (!isMoveLegal(board, move)) return 0;
  const src = board[move.from];
  const dst = board[move.to];
  return Math.min(topRunLength(src), TUBE_CAPACITY - dst.colors.length);
}

export function isSolved(board: Board): boolean {
  return board.every(
    (t) => t.colors.length === 0 || (t.colors.length === TUBE_CAPACITY && t.colors.every((c) => c === t.colors[0])),
  );
}

/** All currently-legal moves on this board — the solver's branching factor and the hint system's candidate set. */
export function legalMoves(board: Board): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < board.length; from++) {
    if (board[from].colors.length === 0) continue;
    for (let to = 0; to < board.length; to++) {
      if (from === to) continue;
      if (isMoveLegal(board, { from, to })) moves.push({ from, to });
    }
  }
  return moves;
}

/** Canonical string key for a board — used by the solver's visited-state set. Tube order matters (it's part of the real game state), so no reordering. */
export function boardKey(board: Board): string {
  return board.map((t) => t.colors.join(',')).join('|');
}
