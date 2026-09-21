export interface AnimalEntry { id: string; name: string; emoji: string }

export const ANIMALS: AnimalEntry[] = [
  { id: 'ant', name: 'Ant', emoji: '🐜' },
  { id: 'bear', name: 'Bear', emoji: '🐻' },
  { id: 'cat', name: 'Cat', emoji: '🐱' },
  { id: 'dog', name: 'Dog', emoji: '🐕' },
  { id: 'elephant', name: 'Elephant', emoji: '🐘' },
  { id: 'fox', name: 'Fox', emoji: '🦊' },
  { id: 'giraffe', name: 'Giraffe', emoji: '🦒' },
  { id: 'lion', name: 'Lion', emoji: '🦁' },
  { id: 'monkey', name: 'Monkey', emoji: '🐵' },
  { id: 'penguin', name: 'Penguin', emoji: '🐧' },
];

const BY_ID: Record<string, AnimalEntry> = Object.fromEntries(
  ANIMALS.map((a) => [a.id, a]),
);

export function getAnimal(id: string): AnimalEntry | undefined {
  return BY_ID[id];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildDeck(pairCount: number) {
  const shuffled = shuffle(ANIMALS);
  const selected = shuffled.slice(0, pairCount);
  const pairs = selected.flatMap((animal) => [
    { animalId: animal.id, revealed: false, matched: false },
    { animalId: animal.id, revealed: false, matched: false },
  ]);
  const shuffledPairs = shuffle(pairs);
  return shuffledPairs.map((card, idx) => ({ ...card, id: `card-${idx}` }));
}
