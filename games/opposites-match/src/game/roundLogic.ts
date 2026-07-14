import type { BinDef, OppositeGameMode, RoundPrompt } from '../types';
import { distinctDistractorWords, randomPair } from '../data/opposites';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function binCountForRound(roundIndex: number): number {
  if (roundIndex < 2) return 2;
  if (roundIndex < 5) return 3;
  return 4;
}

export function generateRound(
  mode: OppositeGameMode,
  roundIndex: number,
  prevPairId: string | null,
): { prompt: RoundPrompt; bins: BinDef[] } {
  const binCount = binCountForRound(roundIndex);
  const pair = randomPair(prevPairId ?? undefined);

  // Randomly choose which side of the pair is the prompt vs. the correct answer.
  const promptIsA = Math.random() < 0.5;
  const word = promptIsA ? pair.wordA : pair.wordB;
  const glyph = promptIsA ? pair.glyphA : pair.glyphB;
  const correctWord = promptIsA ? pair.wordB : pair.wordA;
  const correctGlyph = promptIsA ? pair.glyphB : pair.glyphA;

  const presentation: 'word' | 'picture' =
    mode === 'word' ? 'word' : mode === 'picture' ? 'picture' : Math.random() < 0.5 ? 'word' : 'picture';

  const prompt: RoundPrompt = { pairId: pair.id, word, glyph, correctWord, correctGlyph, presentation };

  const distractors = distinctDistractorWords(pair.id, binCount - 1);
  const bins: BinDef[] = [
    { id: 'bin-correct', word: correctWord, glyph: correctGlyph, isCorrect: true },
    ...distractors.map((d, i) => ({ id: `bin-${i}`, word: d.word, glyph: d.glyph, isCorrect: false })),
  ];

  return { prompt, bins: shuffle(bins) };
}
