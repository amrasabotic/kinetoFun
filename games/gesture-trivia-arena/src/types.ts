export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'classic' | 'blitz';
export type PlayerId = 'you' | 'cpu';
export type Category = 'science' | 'history' | 'geography' | 'pop-culture' | 'sports' | 'general';

/** Abstract gesture API consumed by the game — see hooks/useGesture.ts. */
export interface GestureState {
  cursorX: number; // 0..1 normalized, mirrored — points at an answer tile
  cursorY: number;
  isHovering: boolean; // a hand is currently detected
}

export interface Question {
  id: string;
  category: Category;
  difficulty: 1 | 2 | 3;
  question: string;
  options: string[]; // always length 4
  correctIndex: number;
}

export interface AiProfile {
  accuracy: number; // 0..1 probability the CPU answers correctly
  thinkMs: number; // baseline delay before the CPU's answer reveals, purely cosmetic pacing
  thinkJitterMs: number;
}

/**
 * Difficulty only ever changes the CPU's accuracy/speed, never the rules or
 * the player's own dwell time — the same principle Gesture Darts' AI
 * opponent follows (see DIFFICULTY_AI there).
 */
export const DIFFICULTY_AI: Record<Difficulty, AiProfile> = {
  easy: { accuracy: 0.4, thinkMs: 3200, thinkJitterMs: 1400 },
  medium: { accuracy: 0.65, thinkMs: 2200, thinkJitterMs: 1000 },
  hard: { accuracy: 0.85, thinkMs: 1300, thinkJitterMs: 700 },
};

export const TOTAL_ROUNDS = 9;
export const BLITZ_TIME_LIMIT_MS = 8000; // per-question countdown in Blitz mode; unanswered = wrong
export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 50; // awarded in full for an instant correct answer, tapering to 0 by the time limit

export type RoundPhase = 'ANSWERING' | 'REVEAL' | 'DONE';

export interface CpuOutcome {
  correct: boolean;
  answerMs: number;
}

export interface RoundRecord {
  questionId: string;
  playerCorrect: boolean;
  cpuCorrect: boolean;
  playerAnswerMs: number | null; // null if the player timed out (Blitz mode only)
  cpuAnswerMs: number;
}

export interface MatchState {
  mode: GameMode;
  difficulty: Difficulty;
  daily: boolean;
  questions: Question[]; // the full match's question sequence, drawn once at creation
  roundIndex: number;
  phase: RoundPhase;
  cpuOutcome: CpuOutcome; // precomputed the instant the current round starts
  playerAnswerIndex: number | null;
  playerCorrect: boolean | null;
  playerScore: number;
  cpuScore: number;
  playerCorrectCount: number;
  cpuCorrectCount: number;
  history: RoundRecord[];
  winner: PlayerId | 'tie' | null; // set once phase === 'DONE'
}
