export interface LetterEntry { letter: string; word: string; emoji: string }

export const LETTERS: LetterEntry[] = [
  { letter: 'A', word: 'Ant', emoji: '🐜' },
  { letter: 'B', word: 'Bear', emoji: '🐻' },
  { letter: 'C', word: 'Cat', emoji: '🐱' },
  { letter: 'D', word: 'Dog', emoji: '🐕' },
  { letter: 'E', word: 'Elephant', emoji: '🐘' },
  { letter: 'F', word: 'Fox', emoji: '🦊' },
  { letter: 'G', word: 'Giraffe', emoji: '🦒' },
  { letter: 'H', word: 'Horse', emoji: '🐴' },
  { letter: 'I', word: 'Iguana', emoji: '🦎' },
  { letter: 'J', word: 'Jaguar', emoji: '🐆' },
  { letter: 'K', word: 'Koala', emoji: '🐨' },
  { letter: 'L', word: 'Lion', emoji: '🦁' },
  { letter: 'M', word: 'Monkey', emoji: '🐵' },
  { letter: 'N', word: 'Nest', emoji: '🪶' },
  { letter: 'O', word: 'Owl', emoji: '🦉' },
  { letter: 'P', word: 'Penguin', emoji: '🐧' },
  { letter: 'Q', word: 'Queen', emoji: '👑' },
  { letter: 'R', word: 'Rabbit', emoji: '🐰' },
  { letter: 'S', word: 'Snake', emoji: '🐍' },
  { letter: 'T', word: 'Tiger', emoji: '🐯' },
  { letter: 'U', word: 'Umbrella', emoji: '☂️' },
  { letter: 'V', word: 'Violin', emoji: '🎻' },
  { letter: 'W', word: 'Whale', emoji: '🐋' },
  { letter: 'X', word: 'Xylophone', emoji: '🎵' },
  { letter: 'Y', word: 'Yo-yo', emoji: '🪀' },
  { letter: 'Z', word: 'Zebra', emoji: '🦓' },
];

const BY_LETTER: Record<string, LetterEntry> = Object.fromEntries(
  LETTERS.map((l) => [l.letter, l]),
);

export function getLetterEntry(letter: string): LetterEntry | undefined {
  return BY_LETTER[letter.toUpperCase()];
}

export function randomLetter(exclude?: string[]): string {
  const filtered = LETTERS.filter((l) => !exclude?.includes(l.letter));
  const pool = filtered.length > 0 ? filtered : LETTERS;
  return pool[Math.floor(Math.random() * pool.length)].letter;
}
