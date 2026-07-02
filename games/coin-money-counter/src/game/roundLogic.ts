import type { BinDef, MoneyGameMode, RoundPrompt } from '../types';
import { distinctDistractorAmounts, randomAmount } from '../data/coins';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function coinCountRange(roundIndex: number): { min: number; max: number } {
  if (roundIndex < 4) return { min: 1, max: 2 };
  return { min: 1, max: 4 };
}

export function binCountForRound(roundIndex: number): number {
  if (roundIndex < 2) return 2;
  if (roundIndex < 5) return 3;
  return 4;
}

export function generateRound(
  mode: MoneyGameMode,
  roundIndex: number,
  prevAmount: number | null,
): { prompt: RoundPrompt; bins: BinDef[] } {
  const binCount = binCountForRound(roundIndex);
  const { min, max } = coinCountRange(roundIndex);

  const amount = randomAmount(min, max, prevAmount ?? undefined);
  const presentation: 'coins' | 'digital' =
    mode === 'count' ? 'coins' : mode === 'make' ? 'digital' : Math.random() < 0.5 ? 'coins' : 'digital';

  const prompt: RoundPrompt = { amount, presentation };

  const distractors = distinctDistractorAmounts(amount, binCount - 1, min, max);
  const bins: BinDef[] = [
    { id: 'bin-correct', amount, isCorrect: true },
    ...distractors.map((a, i) => ({ id: `bin-${i}`, amount: a, isCorrect: false })),
  ];

  return { prompt, bins: shuffle(bins) };
}
