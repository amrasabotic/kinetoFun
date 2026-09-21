export const WORD_BANK: Record<'easy' | 'medium' | 'hard', string[]> = {
  easy: ['CAT', 'DOG', 'SUN', 'MOON', 'STAR', 'TREE', 'FISH', 'BIRD', 'BOOK', 'DOOR'],
  medium: [
    'PLANET', 'GARDEN', 'BRIDGE', 'CASTLE', 'FOREST', 'RIVER', 'ROCKET', 'GUITAR',
    'CANDLE', 'PUZZLE', 'DRAGON', 'HARBOR',
  ],
  hard: [
    'ELEPHANT', 'MOUNTAIN', 'SYMPHONY', 'TELESCOPE', 'BUTTERFLY', 'ADVENTURE',
    'CRYSTAL', 'LANTERN', 'WHISPER', 'GALAXY', 'HORIZON', 'LABYRINTH',
  ],
};

export function pickWords(difficulty: 'easy' | 'medium' | 'hard', count: number, rng: () => number): string[] {
  const pool = [...WORD_BANK[difficulty]];
  const chosen: string[] = [];
  while (chosen.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}
