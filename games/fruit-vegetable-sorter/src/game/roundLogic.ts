import type { BinDef, ProduceGameMode, RoundPrompt } from '../types';
import { randomProduce } from '../data/produce';

export function generateRound(
  mode: ProduceGameMode,
  _roundIndex: number,
  prevProduceId: string | null,
): { prompt: RoundPrompt; bins: BinDef[] } {
  const target = randomProduce(mode, prevProduceId ?? undefined);
  const prompt: RoundPrompt = { produceId: target.id };

  const bins: BinDef[] = [
    { id: 'bin-fruit', category: 'fruit', isCorrect: target.category === 'fruit' },
    { id: 'bin-vegetable', category: 'vegetable', isCorrect: target.category === 'vegetable' },
  ];

  return { prompt, bins };
}
