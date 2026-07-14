import { useMemo, useState, useCallback } from 'react';
import type { Difficulty, GameMode, PlacedWord } from '../types';
import { DIFFICULTY_CONFIG } from '../types';
import { generatePuzzle } from '../systems/wordPlacementEngine';
import { pickWords } from '../utils/wordBank';
import { mulberry32, dailySeed } from '../utils/helpers';
import type { Vec2 } from '../utils/directions';

export interface PuzzleState {
  grid: string[][];
  words: PlacedWord[];
  size: number;
}

function buildPuzzle(difficulty: Difficulty, mode: GameMode): PuzzleState {
  const config = DIFFICULTY_CONFIG[difficulty];
  const seed = mode === 'daily' ? dailySeed() : Math.floor(Math.random() * 1e9);
  const rng = mulberry32(seed);
  const words = pickWords(difficulty, config.wordCount, rng);
  const { grid, placedWords } = generatePuzzle({
    size: config.size,
    words,
    allowDiagonal: config.allowDiagonal,
    allowReverse: config.allowReverse,
    rng,
  });
  return { grid, words: placedWords, size: config.size };
}

export function useWordSearch(difficulty: Difficulty, mode: GameMode) {
  const [puzzle, setPuzzle] = useState<PuzzleState>(() => buildPuzzle(difficulty, mode));

  const regenerate = useCallback(() => {
    setPuzzle(buildPuzzle(difficulty, mode));
  }, [difficulty, mode]);

  const markFound = useCallback((word: string) => {
    setPuzzle((prev) => ({
      ...prev,
      words: prev.words.map((w) => (w.word === word ? { ...w, found: true } : w)),
    }));
  }, []);

  const findWordMatchingPath = useCallback(
    (path: Vec2[]): PlacedWord | null => {
      if (path.length < 2) return null;
      const forward = path.map((p) => p);
      const reversed = [...path].reverse();

      const matches = (candidateCells: Vec2[], wordCells: Vec2[]) => {
        if (candidateCells.length !== wordCells.length) return false;
        return candidateCells.every((c, i) => c.row === wordCells[i].row && c.col === wordCells[i].col);
      };

      for (const w of puzzle.words) {
        if (w.found) continue;
        if (matches(forward, w.cells) || matches(reversed, w.cells)) return w;
      }
      return null;
    },
    [puzzle.words],
  );

  const allFound = useMemo(() => puzzle.words.length > 0 && puzzle.words.every((w) => w.found), [puzzle.words]);
  const foundCount = useMemo(() => puzzle.words.filter((w) => w.found).length, [puzzle.words]);

  return { puzzle, regenerate, markFound, findWordMatchingPath, allFound, foundCount };
}
