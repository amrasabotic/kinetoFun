import { useCallback, useMemo, useState } from 'react';
import type { CellPos, Difficulty, GameMode, Grid } from '../types';
import { DIFFICULTY_CONFIG } from '../types';
import { generatePuzzle, findConflicts, isSolved } from '../systems/sudokuEngine';
import { mulberry32, dailySeed } from '../utils/helpers';

function buildPuzzle(mode: GameMode, difficulty: Difficulty) {
  const seed = mode === 'daily' ? dailySeed() : Math.floor(Math.random() * 1e9);
  const rng = mulberry32(seed);
  return generatePuzzle(DIFFICULTY_CONFIG[difficulty].clueCount, rng);
}

export function usePuzzle(mode: GameMode, difficulty: Difficulty) {
  const [{ grid }, setPuzzle] = useState(() => buildPuzzle(mode, difficulty));
  const [selected, setSelected] = useState<CellPos | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);

  const conflicts = useMemo(() => findConflicts(grid), [grid]);
  const solved = useMemo(() => isSolved(grid), [grid]);

  const selectCell = useCallback((cell: CellPos) => {
    setSelected(cell);
  }, []);

  const setDigit = useCallback(
    (value: number | null) => {
      if (!selected) return;
      const { row, col } = selected;
      setPuzzle((prev) => {
        if (prev.grid[row][col].isClue) return prev;
        const nextGrid = prev.grid.map((r) => [...r]);
        nextGrid[row][col] = { ...nextGrid[row][col], value };
        return { ...prev, grid: nextGrid };
      });
    },
    [selected],
  );

  /** Reveals the correct digit for just the selected cell — never auto-solves the rest. */
  const useHint = useCallback(() => {
    if (!selected) return;
    const { row, col } = selected;
    setPuzzle((prev) => {
      if (prev.grid[row][col].isClue) return prev;
      const nextGrid = prev.grid.map((r) => [...r]);
      nextGrid[row][col] = { value: prev.solution[row][col], isClue: false };
      return { ...prev, grid: nextGrid };
    });
    setHintsUsed((h) => h + 1);
  }, [selected]);

  const reset = useCallback(() => {
    setPuzzle(buildPuzzle(mode, difficulty));
    setSelected(null);
    setHintsUsed(0);
  }, [mode, difficulty]);

  const filledCount = useMemo(() => grid.flat().filter((c) => c.value !== null).length, [grid]);

  return { grid, selected, conflicts, solved, hintsUsed, filledCount, selectCell, setDigit, useHint, reset };
}

export type { Grid };
