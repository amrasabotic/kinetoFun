// Animals for Animal Sounds mode: each makes a sound children know, and no two share a first letter.
export interface AnimalEntry { letter: string; word: string; emoji: string; says: string }

export const ANIMALS: AnimalEntry[] = [
  { letter: 'B', word: 'Bee', emoji: '🐝', says: 'Buzz' },
  { letter: 'C', word: 'Cow', emoji: '🐮', says: 'Moo' },
  { letter: 'D', word: 'Dog', emoji: '🐕', says: 'Woof woof' },
  { letter: 'E', word: 'Elephant', emoji: '🐘', says: 'Toot' },
  { letter: 'F', word: 'Frog', emoji: '🐸', says: 'Ribbit' },
  { letter: 'G', word: 'Goat', emoji: '🐐', says: 'Maa' },
  { letter: 'H', word: 'Horse', emoji: '🐴', says: 'Neigh' },
  { letter: 'K', word: 'Kitten', emoji: '🐱', says: 'Meow' },
  { letter: 'L', word: 'Lion', emoji: '🦁', says: 'Roar' },
  { letter: 'M', word: 'Monkey', emoji: '🐵', says: 'Ooh ooh aah aah' },
  { letter: 'O', word: 'Owl', emoji: '🦉', says: 'Hoo hoo' },
  { letter: 'P', word: 'Pig', emoji: '🐷', says: 'Oink oink' },
  { letter: 'R', word: 'Rooster', emoji: '🐓', says: 'Cock-a-doodle-doo' },
  { letter: 'S', word: 'Snake', emoji: '🐍', says: 'Hiss' },
  { letter: 'W', word: 'Wolf', emoji: '🐺', says: 'Awoooo' },
];

const BY_LETTER: Record<string, AnimalEntry> = Object.fromEntries(ANIMALS.map((a) => [a.letter, a]));

export function getAnimalEntry(letter: string): AnimalEntry | undefined {
  return BY_LETTER[letter.toUpperCase()];
}

export function randomAnimalLetter(exclude?: string[]): string {
  const pool = ANIMALS.filter((a) => !exclude?.includes(a.letter));
  return (pool.length ? pool : ANIMALS)[Math.floor(Math.random() * (pool.length || ANIMALS.length))].letter;
}
