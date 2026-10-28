import { LevelData, Position } from '../data/types';
import { ballColors } from '../data/themes';

// Pairs are the two ends of paths laid out first, so the paths are a solution and no level is impossible.
export function generateRandomLevel(gridSize: number, pairCount: number, seed?: number): LevelData {
  const rng = createRng(seed ?? Date.now());
  const key = (p: Position) => p.row * gridSize + p.col;
  const used = new Set<number>();
  const freeNeighbors = (p: Position) =>
    [[0, 1], [1, 0], [0, -1], [-1, 0]]
      .map(([dr, dc]) => ({ row: p.row + dr, col: p.col + dc }))
      .filter((n) => n.row >= 0 && n.col >= 0 && n.row < gridSize && n.col < gridSize && !used.has(key(n)));

  for (let attempt = 0; attempt < 200; attempt++) {
    used.clear();
    const pairs: LevelData['pairs'] = [];
    for (let i = 0; i < pairCount; i++) {
      const free: Position[] = [];
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) if (!used.has(row * gridSize + col)) free.push({ row, col });
      }
      const target = Math.max(3, Math.floor((free.length / (pairCount - i)) * (0.75 + rng() * 0.5)));
      // Starting in tight corners and turning toward tight spots makes the paths wind and fill the board.
      const fewest = Math.min(...free.map((p) => freeNeighbors(p).length));
      const starts = free.filter((p) => freeNeighbors(p).length === fewest && fewest > 0);
      if (!starts.length) break;
      let cur = starts[Math.floor(rng() * starts.length)];
      const path = [cur];
      used.add(key(cur));
      while (path.length < target) {
        const next = freeNeighbors(cur).sort(
          (a, b) => freeNeighbors(a).length - freeNeighbors(b).length + (rng() - 0.5) * 1.2,
        )[0];
        if (!next) break;
        cur = next;
        path.push(cur);
        used.add(key(cur));
      }
      if (path.length < 3) break;
      pairs.push({ color: ballColors[i % ballColors.length], positions: [path[0], path[path.length - 1]] });
    }
    if (pairs.length === pairCount) return { id: -1, gridSize, pairs };
  }

  // Unreachable for the sizes the game asks for; a single corner-to-corner pair is always solvable.
  return {
    id: -1,
    gridSize,
    pairs: [{ color: ballColors[0], positions: [{ row: 0, col: 0 }, { row: gridSize - 1, col: gridSize - 1 }] }],
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
