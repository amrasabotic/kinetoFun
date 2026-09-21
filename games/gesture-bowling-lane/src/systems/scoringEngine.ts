import { PIN_LAYOUT } from '../types';

export interface Frame {
  rolls: number[];
  isStrike: boolean;
  isSpare: boolean;
  score: number | null; // this frame's point value including any strike/spare bonus, null while pending
  cumulative: number | null; // running total through this frame, null while any prior frame is pending
  complete: boolean; // this frame has thrown every roll it will ever get (bonus may still be unresolved)
}

const ALL_PIN_IDS = PIN_LAYOUT.map((p) => p.id);

/** Official 10-frame scoring, computed fresh from the flat roll history each time. */
export function computeFrames(rolls: number[]): Frame[] {
  const frames: Frame[] = [];
  let i = 0;

  for (let f = 0; f < 10 && i < rolls.length; f++) {
    const isTenth = f === 9;

    if (!isTenth) {
      if (rolls[i] === 10) {
        const bonus = rolls.slice(i + 1, i + 3);
        const score = bonus.length === 2 ? 10 + bonus[0] + bonus[1] : null;
        frames.push({ rolls: [10], isStrike: true, isSpare: false, score, cumulative: null, complete: true });
        i += 1;
      } else {
        const second = rolls[i + 1];
        if (second === undefined) {
          frames.push({ rolls: [rolls[i]], isStrike: false, isSpare: false, score: null, cumulative: null, complete: false });
          i += 1;
          break;
        }
        const sum = rolls[i] + second;
        const isSpare = sum === 10;
        const score = isSpare ? (rolls[i + 2] !== undefined ? 10 + rolls[i + 2] : null) : sum;
        frames.push({ rolls: [rolls[i], second], isStrike: false, isSpare, score, cumulative: null, complete: true });
        i += 2;
      }
    } else {
      const frameRolls = rolls.slice(i, i + 3);
      const isStrike = frameRolls[0] === 10;
      const isSpare = !isStrike && frameRolls[0] !== undefined && frameRolls[1] !== undefined && frameRolls[0] + frameRolls[1] === 10;
      const ballsAllowed = isStrike || isSpare ? 3 : 2;
      const complete = frameRolls.length >= ballsAllowed;
      const score = complete ? frameRolls.reduce((a, b) => a + b, 0) : null;
      frames.push({ rolls: frameRolls, isStrike, isSpare, score, cumulative: null, complete });
      i += frameRolls.length;
    }
  }

  let running = 0;
  let pending = false;
  for (const fr of frames) {
    if (pending || fr.score === null) {
      pending = true;
      fr.cumulative = null;
      continue;
    }
    running += fr.score;
    fr.cumulative = running;
  }

  return frames;
}

export interface RollContext {
  frameIndex: number; // 0-9
  ballInFrame: number; // 0-based
  standingPinIds: number[];
  gameOver: boolean;
}

export function initialRollContext(): RollContext {
  return { frameIndex: 0, ballInFrame: 0, standingPinIds: [...ALL_PIN_IDS], gameOver: false };
}

/**
 * Advances the live roll-context (which frame/ball is next, which pins are
 * standing) after a roll resolves, following official 10-frame pin-reset
 * rules: frames 1-9 reset to a fresh rack after a strike or after the frame's
 * second ball; the 10th frame resets mid-frame after a strike or a spare so
 * the bonus ball(s) are thrown at a full rack, exactly like a real game.
 */
export function advanceRollContext(context: RollContext, pinfall: number, priorPinfallThisFrame: number | null): RollContext {
  const { frameIndex, ballInFrame } = context;
  const isTenth = frameIndex === 9;

  if (!isTenth) {
    if (ballInFrame === 0) {
      if (pinfall === 10) {
        return { frameIndex: frameIndex + 1, ballInFrame: 0, standingPinIds: [...ALL_PIN_IDS], gameOver: false };
      }
      return { ...context, ballInFrame: 1 };
    }
    return { frameIndex: frameIndex + 1, ballInFrame: 0, standingPinIds: [...ALL_PIN_IDS], gameOver: frameIndex + 1 >= 10 };
  }

  // 10th frame.
  if (ballInFrame === 0) {
    return pinfall === 10
      ? { ...context, ballInFrame: 1, standingPinIds: [...ALL_PIN_IDS] }
      : { ...context, ballInFrame: 1 };
  }

  if (ballInFrame === 1) {
    const firstWasStrike = priorPinfallThisFrame === 10;
    if (firstWasStrike) {
      return pinfall === 10
        ? { ...context, ballInFrame: 2, standingPinIds: [...ALL_PIN_IDS] }
        : { ...context, ballInFrame: 2 };
    }
    const isSpare = (priorPinfallThisFrame ?? 0) + pinfall === 10;
    if (isSpare) {
      return { ...context, ballInFrame: 2, standingPinIds: [...ALL_PIN_IDS] };
    }
    return { ...context, gameOver: true };
  }

  return { ...context, gameOver: true };
}
