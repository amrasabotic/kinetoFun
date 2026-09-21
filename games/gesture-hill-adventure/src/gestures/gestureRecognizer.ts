/**
 * Converts raw HandData into structured GestureState for vehicle control.
 *
 * Control scheme:
 *   Raise hand (palmY < 0.4) → Accelerate  (throttle proportional to height)
 *   Lower hand (palmY > 0.65) → Brake / Reverse
 *   Centre zone → Neutral / Coast
 *   Closed fist → Boost (1-second burst, 5-second cooldown)
 *
 * The sensitivity setting scales the neutral deadband.
 */
import type { HandData, GestureState, GestureType } from '../types';
import {
  BOOST_DURATION_MS,
  BOOST_COOLDOWN_MS,
} from '../constants/gameConfig';

// Boundary thresholds (normalised palmY, 0=top)
const ACCEL_FULL  = 0.20;   // above this → full throttle
const ACCEL_START = 0.42;   // below this → start accelerating
const BRAKE_START = 0.60;   // above this → start braking
const BRAKE_FULL  = 0.82;   // above this → full brake

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

export interface GestureRecognizer {
  update: (hand: HandData, dt: number, sensitivity: number) => GestureState;
  state:  GestureState;
}

export function createGestureRecognizer(): GestureRecognizer {
  let boostRemainingMs  = 0;
  let boostCooldownMs   = 0;
  let state: GestureState = {
    type:             'neutral',
    throttle:         0,
    boostActive:      false,
    boostCooldownMs:  0,
  };

  function update(hand: HandData, dt: number, sensitivity: number): GestureState {
    // Tick timers
    if (boostRemainingMs > 0) {
      boostRemainingMs -= dt;
      if (boostRemainingMs <= 0) {
        boostRemainingMs = 0;
        boostCooldownMs  = BOOST_COOLDOWN_MS;
      }
    } else if (boostCooldownMs > 0) {
      boostCooldownMs = Math.max(0, boostCooldownMs - dt);
    }

    if (!hand.detected) {
      state = { type: 'neutral', throttle: 0, boostActive: false, boostCooldownMs };
      return state;
    }

    // Boost: fist triggers it when cooldown is ready
    if (hand.isFist && boostCooldownMs === 0 && boostRemainingMs === 0) {
      boostRemainingMs = BOOST_DURATION_MS;
    }

    const boostActive = boostRemainingMs > 0;

    // Scale thresholds by sensitivity (higher = more responsive / wider range)
    const sens     = sensitivity;
    const aFull    = lerp(ACCEL_FULL,  0.10, sens - 1);
    const aStart   = lerp(ACCEL_START, 0.48, sens - 1);
    const bStart   = lerp(BRAKE_START, 0.55, sens - 1);
    const bFull    = lerp(BRAKE_FULL,  0.90, sens - 1);

    const py = hand.palmY;
    let throttle = 0;
    let gestureType: GestureType;

    if (py < aFull) {
      throttle    = 1;
      gestureType = 'accelerate';
    } else if (py < aStart) {
      throttle    = 1 - (py - aFull) / (aStart - aFull);
      gestureType = 'accelerate';
    } else if (py > bFull) {
      throttle    = -1;
      gestureType = 'brake';
    } else if (py > bStart) {
      throttle    = -((py - bStart) / (bFull - bStart));
      gestureType = 'brake';
    } else {
      throttle    = 0;
      gestureType = 'neutral';
    }

    if (boostActive) gestureType = 'boost';

    state = {
      type:            gestureType,
      throttle:        Math.max(-1, Math.min(1, throttle)),
      boostActive,
      boostCooldownMs,
    };
    return state;
  }

  return { update, get state() { return state; } };
}
