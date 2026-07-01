import type { BinDef, RoundPrompt, SortMode } from '../types';
import { SHAPES, randomShape } from '../data/shapes';
import { COLORS, randomColor } from '../data/colors';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Bin count grows gently with round index: 2 → 3 → 4, capped at 4 for a toddler-friendly session. */
export function binCountForRound(roundIndex: number): number {
  if (roundIndex < 3) return 2;
  if (roundIndex < 7) return 3;
  return 4;
}

export function generateRound(mode: SortMode, roundIndex: number, prevPrompt: RoundPrompt | null): { prompt: RoundPrompt; bins: BinDef[] } {
  const binCount = binCountForRound(roundIndex);
  const allShapeIds = SHAPES.map((s) => s.id);
  const allColorIds = COLORS.map((c) => c.id);

  const shape = randomShape(prevPrompt ? [prevPrompt.shape] : undefined);
  const color = randomColor(prevPrompt ? [prevPrompt.color] : undefined);
  const prompt: RoundPrompt = { shape, color };
  let bins: BinDef[];

  if (mode === 'shape') {
    const distractorShapes = shuffle(allShapeIds.filter((s) => s !== shape)).slice(0, binCount - 1);
    bins = [{ id: 'bin-correct', shape, isCorrect: true }, ...distractorShapes.map((s, i) => ({ id: `bin-${i}`, shape: s, isCorrect: false }))];
  } else if (mode === 'color') {
    const distractorColors = shuffle(allColorIds.filter((c) => c !== color)).slice(0, binCount - 1);
    bins = [{ id: 'bin-correct', color, isCorrect: true }, ...distractorColors.map((c, i) => ({ id: `bin-${i}`, color: c, isCorrect: false }))];
  } else {
    const combos: BinDef[] = [{ id: 'bin-correct', shape, color, isCorrect: true }];
    const seen = new Set([`${shape}:${color}`]);
    let guard = 0;
    while (combos.length < binCount && guard < 200) {
      guard += 1;
      const s = allShapeIds[Math.floor(Math.random() * allShapeIds.length)];
      const c = allColorIds[Math.floor(Math.random() * allColorIds.length)];
      const key = `${s}:${c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      combos.push({ id: `bin-${combos.length}`, shape: s, color: c, isCorrect: false });
    }
    bins = combos;
  }

  return { prompt, bins: shuffle(bins) };
}
