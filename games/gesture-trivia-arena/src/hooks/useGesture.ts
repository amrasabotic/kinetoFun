import type { GestureState } from '../types';
import { useGestureContext } from '../mediaPipe/GestureProvider';

/**
 * Abstract gesture input surface consumed by all game logic. Backed by
 * KinetoFun's webcam hand tracking (see mediaPipe/GestureProvider), but the
 * rest of the game only ever depends on this shape.
 */
export function useGesture(): GestureState {
  return useGestureContext().state;
}

/** Ref-based variant for RAF game loops that must avoid per-frame re-renders. */
export function useGestureRef() {
  return useGestureContext().stateRef;
}
