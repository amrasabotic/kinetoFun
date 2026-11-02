import type { BinDef, LetterGameMode, RoundPrompt } from '../types';
import { LETTERS, randomLetter } from '../data/letters';
import { randomAnimalLetter } from '../data/animals';

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
  if (roundIndex < 2) return 2;
  if (roundIndex < 5) return 3;
  return 4;
}

export function generateRound(roundIndex: number, prevPrompt: RoundPrompt | null, mode: LetterGameMode = 'letter'): { prompt: RoundPrompt; bins: BinDef[] } {
  const binCount = binCountForRound(roundIndex);
  const allLetters = LETTERS.map((l) => l.letter);

  const exclude = prevPrompt ? [prevPrompt.letter] : undefined;
  // Animal Sounds only asks about animals that have a call; the other modes use the whole alphabet.
  const letter = mode === 'animal' ? randomAnimalLetter(exclude) : randomLetter(exclude);
  const prompt: RoundPrompt = { letter };

  const distractors = shuffle(allLetters.filter((l) => l !== letter)).slice(0, binCount - 1);
  const bins: BinDef[] = [
    { id: 'bin-correct', letter, isCorrect: true },
    ...distractors.map((l, i) => ({ id: `bin-${i}`, letter: l, isCorrect: false })),
  ];

  return { prompt, bins: shuffle(bins) };
}
