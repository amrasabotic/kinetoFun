import type { BinDef, ClockGameMode, RoundPrompt, TimeValue } from '../types';
import { distinctDistractorTimes, minuteOptionsForRound, randomTime } from '../data/times';

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

export function generateRound(
  mode: ClockGameMode,
  roundIndex: number,
  prevTime: TimeValue | null,
): { prompt: RoundPrompt; bins: BinDef[] } {
  const binCount = binCountForRound(roundIndex);
  const minuteOptions = minuteOptionsForRound(roundIndex);

  const time = randomTime(minuteOptions, prevTime ?? undefined);
  const presentation: 'clock' | 'digital' =
    mode === 'read' ? 'clock' : mode === 'set' ? 'digital' : Math.random() < 0.5 ? 'clock' : 'digital';

  const prompt: RoundPrompt = { time, presentation };

  const distractors = distinctDistractorTimes(time, binCount - 1, minuteOptions);
  const bins: BinDef[] = [
    { id: 'bin-correct', time, isCorrect: true },
    ...distractors.map((t, i) => ({ id: `bin-${i}`, time: t, isCorrect: false })),
  ];

  return { prompt, bins: shuffle(bins) };
}
