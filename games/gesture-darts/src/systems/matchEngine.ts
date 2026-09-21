import type { DartOutcome, GameMode, PlayerId } from '../types';
import { applyX01Throw } from './x01Engine';
import { applyCricketThrow, initialCricketMarks, isCricketClosed, type CricketMarks } from './cricketEngine';

export type TurnPhase = 'PLAYER_TURN' | 'CPU_TURN' | 'GAME_OVER';

export interface PlayerState {
  score: number; // x01: remaining countdown; cricket: points scored
  marks: CricketMarks; // unused in x01 modes
}

const X01_START: Record<string, number> = { '301': 301, '501': 501 };
const DARTS_PER_TURN = 3;

export function freshPlayer(mode: GameMode): PlayerState {
  return { score: mode === 'cricket' ? 0 : X01_START[mode], marks: initialCricketMarks() };
}

export interface MatchState {
  mode: GameMode;
  phase: TurnPhase;
  dartsThisTurn: number;
  turnStartScore: number; // the active player's x01 score before any dart this turn — bust reverts here, not just to pre-dart
  you: PlayerState;
  cpu: PlayerState;
  turnDarts: { player: PlayerId; outcome: DartOutcome }[];
  winner: PlayerId | null;
  bustFlash: boolean;
  /** Raw points landed per player across the whole match, independent of x01/cricket rules — used only for the leaderboard score (higher-is-better, matching every other game in this catalog). */
  pointsScored: Record<PlayerId, number>;
}

export function initialMatch(mode: GameMode): MatchState {
  const you = freshPlayer(mode);
  return {
    mode,
    phase: 'PLAYER_TURN',
    dartsThisTurn: 0,
    turnStartScore: you.score,
    you,
    cpu: freshPlayer(mode),
    turnDarts: [],
    winner: null,
    bustFlash: false,
    pointsScored: { you: 0, cpu: 0 },
  };
}

/**
 * Applies one dart (from either player) to the match: scoring, x01
 * bust/checkout rules, turn advancement, and win detection all live here —
 * the single place turn logic exists, mirroring this catalog's convention
 * of one pure engine function per game (e.g. tickShot, stepBall).
 */
export function applyDart(match: MatchState, player: PlayerId, outcome: DartOutcome): MatchState {
  if (match.phase === 'GAME_OVER') return match;

  const turnDarts = [...match.turnDarts, { player, outcome }];
  const pointsScored = { ...match.pointsScored, [player]: match.pointsScored[player] + outcome.points };
  let you = match.you;
  let cpu = match.cpu;
  let bust = false;
  let won = false;

  if (match.mode === 'cricket') {
    const state = player === 'you' ? you : cpu;
    const opponent = player === 'you' ? cpu : you;
    const result = applyCricketThrow(state.marks, opponent.marks, outcome);
    const nextState: PlayerState = { marks: result.marks, score: state.score + result.scoreDelta };
    if (player === 'you') you = nextState;
    else cpu = nextState;
    won = isCricketClosed(nextState.marks) && nextState.score >= opponent.score;
  } else {
    const state = player === 'you' ? you : cpu;
    const result = applyX01Throw(state.score, outcome);
    bust = result.bust;
    won = result.won;
    const nextScore = bust ? match.turnStartScore : result.remaining;
    const nextState: PlayerState = { ...state, score: nextScore };
    if (player === 'you') you = nextState;
    else cpu = nextState;
  }

  const dartsThisTurn = match.dartsThisTurn + 1;

  if (won) {
    return { ...match, you, cpu, turnDarts, dartsThisTurn, pointsScored, winner: player, phase: 'GAME_OVER', bustFlash: false };
  }

  const turnOver = bust || dartsThisTurn >= DARTS_PER_TURN;
  if (!turnOver) {
    return { ...match, you, cpu, turnDarts, dartsThisTurn, pointsScored, bustFlash: false };
  }

  const nextPlayer: PlayerId = player === 'you' ? 'cpu' : 'you';
  const nextPlayerState = nextPlayer === 'you' ? you : cpu;
  return {
    ...match,
    you,
    cpu,
    pointsScored,
    turnDarts: [],
    dartsThisTurn: 0,
    turnStartScore: nextPlayerState.score,
    phase: nextPlayer === 'you' ? 'PLAYER_TURN' : 'CPU_TURN',
    bustFlash: bust,
  };
}
