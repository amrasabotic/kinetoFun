import { useCallback, useRef, useState } from 'react';
import type { Board, LevelConfig, Move } from '../types';
import { applyMove, isMoveLegal, isSolved as boardIsSolved } from '../systems/puzzleRules';
import { generateBoard } from '../utils/puzzleGenerator';
import { findHint, optimalMoveCount } from '../utils/solver';
import { mulberry32 } from '../utils/helpers';

export interface GameSession {
  board: Board;
  colorCount: number;
  movesUsed: number;
  hintsUsed: number;
  undosUsed: number;
  isSolved: boolean;
  activeHint: Move | null;
  parMoves: number | null;
  /** Attempts a pour; returns false (and leaves the board untouched) if the move is illegal. */
  pour: (from: number, to: number) => boolean;
  undo: () => void;
  requestHint: () => Move | null;
  dismissHint: () => void;
  elapsedMs: () => number;
}

/**
 * Owns one puzzle's live state: the board history (so undo is just "drop
 * the last entry," with the full stack kept rather than a single
 * previous-board pointer so *unlimited* undo is free), hint/undo counters
 * for scoring, and the solver-derived par used for star grading. A new
 * level is a fresh mount of this hook (parent remounts via a `key` change)
 * rather than an in-place reset method, keeping this hook's own state
 * shape simple.
 */
export function useGameSession(config: LevelConfig, seed: number): GameSession {
  const [history, setHistory] = useState<Board[]>(() => [generateBoard(config, mulberry32(seed))]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [undosUsed, setUndosUsed] = useState(0);
  const [activeHint, setActiveHint] = useState<Move | null>(null);
  const startedAtRef = useRef(performance.now());
  // Par never changes once a level starts (it's relative to the starting
  // board), so it's computed once here rather than recomputed — via a
  // solver search — after every single pour.
  const [parMoves] = useState<number | null>(() => optimalMoveCount(history[0]));

  const board = history[history.length - 1];
  const solved = boardIsSolved(board);

  const pour = useCallback(
    (from: number, to: number) => {
      if (solved || !isMoveLegal(board, { from, to })) return false;
      const next = applyMove(board, { from, to });
      setHistory((h) => [...h, next]);
      setActiveHint(null);
      return true;
    },
    [board, solved],
  );

  const undo = useCallback(() => {
    if (history.length <= 1) return;
    setUndosUsed((u) => u + 1);
    setHistory((h) => h.slice(0, -1));
    setActiveHint(null);
  }, [history.length]);

  const requestHint = useCallback((): Move | null => {
    if (solved) return null;
    const hint = findHint(board);
    if (hint) {
      setHintsUsed((h) => h + 1);
      setActiveHint(hint);
    }
    return hint;
  }, [board, solved]);

  const dismissHint = useCallback(() => setActiveHint(null), []);

  return {
    board,
    colorCount: config.colorCount,
    movesUsed: history.length - 1,
    hintsUsed,
    undosUsed,
    isSolved: solved,
    activeHint,
    parMoves,
    pour,
    undo,
    requestHint,
    dismissHint,
    elapsedMs: () => performance.now() - startedAtRef.current,
  };
}
