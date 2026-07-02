export type OppositeGlyph =
  | 'big' | 'small' | 'hot' | 'cold' | 'fast' | 'slow' | 'up' | 'down'
  | 'happy' | 'sad' | 'day' | 'night' | 'open' | 'closed' | 'full' | 'empty'
  | 'tall' | 'short' | 'wet' | 'dry' | 'loud' | 'quiet' | 'heavy' | 'light';

export interface OppositePair {
  id: string;
  wordA: string;
  wordB: string;
  glyphA: OppositeGlyph;
  glyphB: OppositeGlyph;
}

export const PAIRS: OppositePair[] = [
  { id: 'big-small', wordA: 'Big', wordB: 'Small', glyphA: 'big', glyphB: 'small' },
  { id: 'hot-cold', wordA: 'Hot', wordB: 'Cold', glyphA: 'hot', glyphB: 'cold' },
  { id: 'fast-slow', wordA: 'Fast', wordB: 'Slow', glyphA: 'fast', glyphB: 'slow' },
  { id: 'up-down', wordA: 'Up', wordB: 'Down', glyphA: 'up', glyphB: 'down' },
  { id: 'happy-sad', wordA: 'Happy', wordB: 'Sad', glyphA: 'happy', glyphB: 'sad' },
  { id: 'day-night', wordA: 'Day', wordB: 'Night', glyphA: 'day', glyphB: 'night' },
  { id: 'open-closed', wordA: 'Open', wordB: 'Closed', glyphA: 'open', glyphB: 'closed' },
  { id: 'full-empty', wordA: 'Full', wordB: 'Empty', glyphA: 'full', glyphB: 'empty' },
  { id: 'tall-short', wordA: 'Tall', wordB: 'Short', glyphA: 'tall', glyphB: 'short' },
  { id: 'wet-dry', wordA: 'Wet', wordB: 'Dry', glyphA: 'wet', glyphB: 'dry' },
  { id: 'loud-quiet', wordA: 'Loud', wordB: 'Quiet', glyphA: 'loud', glyphB: 'quiet' },
  { id: 'heavy-light', wordA: 'Heavy', wordB: 'Light', glyphA: 'heavy', glyphB: 'light' },
];

export function pairById(id: string): OppositePair | undefined {
  return PAIRS.find((p) => p.id === id);
}

export function randomPair(exclude?: string): OppositePair {
  let candidate: OppositePair;
  let guard = 0;
  do {
    guard += 1;
    candidate = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  } while (exclude && candidate.id === exclude && guard < 50);
  return candidate;
}

interface WordEntry {
  pairId: string;
  word: string;
  glyph: OppositeGlyph;
}

function allWords(): WordEntry[] {
  return PAIRS.flatMap((p) => [
    { pairId: p.id, word: p.wordA, glyph: p.glyphA },
    { pairId: p.id, word: p.wordB, glyph: p.glyphB },
  ]);
}

/** Distractor words are drawn from other pairs entirely, so they're never the target pair's own words. */
export function distinctDistractorWords(targetPairId: string, count: number): WordEntry[] {
  const pool = allWords().filter((w) => w.pairId !== targetPairId);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  const seen = new Set<string>();
  const result: WordEntry[] = [];
  for (const entry of shuffled) {
    if (seen.has(entry.pairId)) continue;
    seen.add(entry.pairId);
    result.push(entry);
    if (result.length >= count) break;
  }
  return result;
}
