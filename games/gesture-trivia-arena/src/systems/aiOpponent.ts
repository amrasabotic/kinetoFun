import type { CpuOutcome, Difficulty } from '../types';
import { DIFFICULTY_AI } from '../types';

/** The CPU's outcome for one round: whether it answers correctly and how long it takes — both purely a function of difficulty and the rng, same as Gesture Darts' AI opponent scaling only its jitter by difficulty. */
export function simulateCpuAnswer(difficulty: Difficulty, rng: () => number): CpuOutcome {
  const profile = DIFFICULTY_AI[difficulty];
  const correct = rng() < profile.accuracy;
  const answerMs = profile.thinkMs + rng() * profile.thinkJitterMs;
  return { correct, answerMs };
}
