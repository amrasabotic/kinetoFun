import type { BinDef, WeatherGameMode, RoundPrompt } from '../types';
import { distinctDistractorScenarios, randomScenario } from '../data/weather';

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
  mode: WeatherGameMode,
  roundIndex: number,
  prevScenarioId: string | null,
): { prompt: RoundPrompt; bins: BinDef[] } {
  const binCount = binCountForRound(roundIndex);

  const target = randomScenario(prevScenarioId ?? undefined);
  const presentation: 'weather' | 'clothing' =
    mode === 'wear' ? 'weather' : mode === 'match' ? 'clothing' : Math.random() < 0.5 ? 'weather' : 'clothing';

  const prompt: RoundPrompt = { scenarioId: target.id, presentation };

  const distractors = distinctDistractorScenarios(target, binCount - 1);
  const bins: BinDef[] = [
    { id: 'bin-correct', scenarioId: target.id, isCorrect: true },
    ...distractors.map((s, i) => ({ id: `bin-${i}`, scenarioId: s.id, isCorrect: false })),
  ];

  return { prompt, bins: shuffle(bins) };
}
