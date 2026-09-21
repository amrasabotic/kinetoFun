import type { Difficulty, GameMode, MatchState } from '../types';
import { BASE_POINTS, BLITZ_TIME_LIMIT_MS, MAX_SPEED_BONUS, TOTAL_ROUNDS } from '../types';
import { pickQuestions } from './quizEngine';
import { simulateCpuAnswer } from './aiOpponent';

function speedBonus(answerMs: number): number {
  const frac = Math.max(0, 1 - answerMs / BLITZ_TIME_LIMIT_MS);
  return Math.round(MAX_SPEED_BONUS * frac);
}

/** Draws the full match's question sequence up front (so Daily mode is deterministic regardless of how long the player takes on any round) and precomputes the first round's CPU outcome. */
export function createMatch(mode: GameMode, difficulty: Difficulty, daily: boolean, rng: () => number): MatchState {
  const questions = pickQuestions(TOTAL_ROUNDS, rng);
  return {
    mode,
    difficulty,
    daily,
    questions,
    roundIndex: 0,
    phase: 'ANSWERING',
    cpuOutcome: simulateCpuAnswer(difficulty, rng),
    playerAnswerIndex: null,
    playerCorrect: null,
    playerScore: 0,
    cpuScore: 0,
    playerCorrectCount: 0,
    cpuCorrectCount: 0,
    history: [],
    winner: null,
  };
}

function applyRoundResult(match: MatchState, playerCorrect: boolean, playerAnswerIndex: number | null, answerMs: number): MatchState {
  const playerPoints = playerCorrect ? BASE_POINTS + speedBonus(answerMs) : 0;
  const cpuPoints = match.cpuOutcome.correct ? BASE_POINTS + speedBonus(match.cpuOutcome.answerMs) : 0;
  const isLastRound = match.roundIndex >= match.questions.length - 1;
  const playerScore = match.playerScore + playerPoints;
  const cpuScore = match.cpuScore + cpuPoints;

  return {
    ...match,
    playerAnswerIndex,
    playerCorrect,
    playerScore,
    cpuScore,
    playerCorrectCount: match.playerCorrectCount + (playerCorrect ? 1 : 0),
    cpuCorrectCount: match.cpuCorrectCount + (match.cpuOutcome.correct ? 1 : 0),
    history: [
      ...match.history,
      {
        questionId: match.questions[match.roundIndex].id,
        playerCorrect,
        cpuCorrect: match.cpuOutcome.correct,
        playerAnswerMs: playerAnswerIndex === null ? null : answerMs,
        cpuAnswerMs: match.cpuOutcome.answerMs,
      },
    ],
    phase: isLastRound ? 'DONE' : 'REVEAL',
    winner: isLastRound ? (playerScore > cpuScore ? 'you' : cpuScore > playerScore ? 'cpu' : 'tie') : null,
  };
}

/** The player selected an answer tile via hover-dwell. `answerMs` is how long they took, used for the speed bonus. */
export function submitPlayerAnswer(match: MatchState, selectedIndex: number, answerMs: number): MatchState {
  if (match.phase !== 'ANSWERING') return match;
  const correct = selectedIndex === match.questions[match.roundIndex].correctIndex;
  return applyRoundResult(match, correct, selectedIndex, answerMs);
}

/** Blitz mode only: the per-question countdown ran out before the player answered. */
export function submitTimeout(match: MatchState): MatchState {
  if (match.phase !== 'ANSWERING') return match;
  return applyRoundResult(match, false, null, BLITZ_TIME_LIMIT_MS);
}

/** Moves from the post-round REVEAL screen to the next question, precomputing that round's CPU outcome. */
export function advanceRound(match: MatchState, rng: () => number): MatchState {
  if (match.phase !== 'REVEAL') return match;
  return {
    ...match,
    roundIndex: match.roundIndex + 1,
    phase: 'ANSWERING',
    cpuOutcome: simulateCpuAnswer(match.difficulty, rng),
    playerAnswerIndex: null,
    playerCorrect: null,
  };
}
