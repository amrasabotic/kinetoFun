import { LevelData, Position } from '../data/types';
import { ballColors } from '../data/themes';

export function generateRandomLevel(gridSize: number, pairCount: number, seed?: number): LevelData {
  const rng = createRng(seed ?? Date.now());
  const pairs: LevelData['pairs'] = [];
  const usedPositions = new Set<string>();

  for (let i = 0; i < pairCount; i++) {
    let pos1: Position;
    let pos2: Position;
    let attempts = 0;

    do {
      pos1 = { row: Math.floor(rng() * gridSize), col: Math.floor(rng() * gridSize) };
      pos2 = { row: Math.floor(rng() * gridSize), col: Math.floor(rng() * gridSize) };
      attempts++;
    } while (
      attempts < 100 &&
      (usedPositions.has(`${pos1.row},${pos1.col}`) ||
        usedPositions.has(`${pos2.row},${pos2.col}`) ||
        (pos1.row === pos2.row && pos1.col === pos2.col))
    );

    if (attempts >= 100) break;

    usedPositions.add(`${pos1.row},${pos1.col}`);
    usedPositions.add(`${pos2.row},${pos2.col}`);
    pairs.push({
      color: ballColors[i % ballColors.length],
      positions: [pos1, pos2],
    });
  }

  return {
    id: -1,
    gridSize,
    pairs,
  };
}

export function generateDailyChallenge(): LevelData {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return generateRandomLevel(7, 6, seed);
}

function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
