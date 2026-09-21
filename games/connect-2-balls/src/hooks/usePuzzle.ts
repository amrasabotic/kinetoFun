import { useState, useCallback } from 'react';
import { GameState, PathSegment, Position, LevelData, GameMode } from '../data/types';
import { posEquals, canMoveTo, isLevelComplete } from '../systems/PathSystem';
import { calculateScore } from '../systems/ScoreSystem';
import { getHint } from '../systems/HintSystem';

export function usePuzzle(level: LevelData, _mode: GameMode) {
  const [gameState, setGameState] = useState<GameState>(() => ({
    currentLevel: level.id,
    paths: [],
    activePath: null,
    isDrawing: false,
    mistakes: 0,
    startTime: Date.now(),
    hintsUsed: 0,
    combo: 0,
  }));

  const [completed, setCompleted] = useState(false);
  const [hintCell, setHintCell] = useState<Position | null>(null);

  const resetLevel = useCallback(() => {
    setGameState({
      currentLevel: level.id,
      paths: [],
      activePath: null,
      isDrawing: false,
      mistakes: 0,
      startTime: Date.now(),
      hintsUsed: 0,
      combo: 0,
    });
    setCompleted(false);
    setHintCell(null);
  }, [level.id]);

  const startDrawing = useCallback((pos: Position) => {
    const pairIndex = level.pairs.findIndex(
      (pair) => posEquals(pair.positions[0], pos) || posEquals(pair.positions[1], pos)
    );
    if (pairIndex === -1) return;

    // Remove existing path for this pair
    setGameState((prev) => {
      const newPaths = prev.paths.filter((p) => p.pairId !== pairIndex);
      return {
        ...prev,
        paths: newPaths,
        activePath: {
          pairId: pairIndex,
          color: level.pairs[pairIndex].color,
          cells: [pos],
          completed: false,
        },
        isDrawing: true,
      };
    });
    setHintCell(null);
  }, [level]);

  const extendPath = useCallback((pos: Position) => {
    setGameState((prev) => {
      if (!prev.activePath || !prev.isDrawing) return prev;

      const lastCell = prev.activePath.cells[prev.activePath.cells.length - 1];
      if (posEquals(lastCell, pos)) return prev;

      // Check if backtracking
      if (prev.activePath.cells.length >= 2) {
        const secondLast = prev.activePath.cells[prev.activePath.cells.length - 2];
        if (posEquals(secondLast, pos)) {
          return {
            ...prev,
            activePath: {
              ...prev.activePath,
              cells: prev.activePath.cells.slice(0, -1),
            },
          };
        }
      }

      // Check if already in path
      if (prev.activePath.cells.some((c) => posEquals(c, pos))) return prev;

      // Check if valid move
      if (!canMoveTo(lastCell, pos, level.gridSize, prev.paths, level, prev.activePath.pairId)) {
        return prev;
      }

      return {
        ...prev,
        activePath: {
          ...prev.activePath,
          cells: [...prev.activePath.cells, pos],
        },
      };
    });
  }, [level]);

  const finishDrawing = useCallback((pos: Position) => {
    setGameState((prev) => {
      if (!prev.activePath || !prev.isDrawing) return { ...prev, isDrawing: false };

      const pair = level.pairs[prev.activePath.pairId];
      const startPos = prev.activePath.cells[0];
      const isStart = posEquals(startPos, pair.positions[0]);
      const targetPos = isStart ? pair.positions[1] : pair.positions[0];

      if (posEquals(pos, targetPos)) {
        const completedPath: PathSegment = {
          ...prev.activePath,
          cells: [...prev.activePath.cells, pos],
          completed: true,
        };
        const newPaths = [...prev.paths, completedPath];
        const isComplete = isLevelComplete(newPaths, level);
        if (isComplete) {
          setTimeout(() => setCompleted(true), 300);
        }
        return {
          ...prev,
          paths: newPaths,
          activePath: null,
          isDrawing: false,
        };
      }

      return {
        ...prev,
        activePath: null,
        isDrawing: false,
        mistakes: prev.mistakes + 1,
      };
    });
  }, [level]);

  const cancelDrawing = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      activePath: null,
      isDrawing: false,
    }));
  }, []);

  const undoLastPath = useCallback(() => {
    setGameState((prev) => {
      if (prev.paths.length === 0) return prev;
      return {
        ...prev,
        paths: prev.paths.slice(0, -1),
      };
    });
  }, []);

  const useHint = useCallback(() => {
    const hint = getHint(level, gameState.paths);
    if (hint) {
      setHintCell(hint.nextCell);
      setGameState((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
    }
  }, [level, gameState.paths]);

  const getScore = useCallback(() => {
    const elapsed = (Date.now() - gameState.startTime) / 1000;
    return calculateScore(elapsed, gameState.mistakes, gameState.hintsUsed, level.gridSize, level.pairs.length);
  }, [gameState, level]);

  return {
    gameState,
    completed,
    hintCell,
    startDrawing,
    extendPath,
    finishDrawing,
    cancelDrawing,
    undoLastPath,
    useHint,
    resetLevel,
    getScore,
  };
}
