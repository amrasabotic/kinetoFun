import type { Category, Question } from '../types';
import { QUESTIONS } from '../data/questions';

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Draws `count` distinct questions (optionally filtered to one category), shuffled by the given rng — the only source of randomness, so a seeded rng makes Daily mode's question set identical for every player that day. */
export function pickQuestions(count: number, rng: () => number, category?: Category): Question[] {
  const pool = category ? QUESTIONS.filter((q) => q.category === category) : QUESTIONS;
  return shuffle(pool, rng).slice(0, count);
}
