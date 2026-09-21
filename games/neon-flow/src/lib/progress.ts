import type { LevelRecord } from "./levels";

const KEY = "neonflow:progress:v1";

export interface Progress {
  records: Record<number, LevelRecord>;
  highestUnlocked: number;
}

const empty = (): Progress => ({ records: {}, highestUnlocked: 1 });

export function loadProgress(): Progress {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) };
  } catch {
    return empty();
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function recordCompletion(levelId: number, moves: number, minMoves: number, totalLevels: number): Progress {
  const p = loadProgress();
  const prev = p.records[levelId];
  const bestMoves = prev ? Math.min(prev.bestMoves, moves) : moves;
  const star = bestMoves <= minMoves;
  p.records[levelId] = { bestMoves, star };
  p.highestUnlocked = Math.max(p.highestUnlocked, Math.min(levelId + 1, totalLevels));
  saveProgress(p);
  return p;
}

export function resetProgress() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}