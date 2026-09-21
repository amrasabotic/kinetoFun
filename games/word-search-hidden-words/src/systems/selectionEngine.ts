import type { SelectionSnapshot, SelectionState } from '../types';
import type { Vec2 } from '../utils/directions';
import { normalizeDirection, vecEquals } from '../utils/directions';

export function initialSnapshot(): SelectionSnapshot {
  return { state: 'IDLE', hoveredCell: null, path: [], lockedDirection: null };
}

interface TickInput {
  snapshot: SelectionSnapshot;
  hoveredCell: Vec2 | null; // null when the index-finger cursor is off-grid
  isPinching: boolean; // thumb+index "pick" held down
  isFist: boolean;
}

/**
 * Pure state-machine transition function. The index finger only ever moves
 * the cursor; a pinch ("pick") is the sole trigger that can advance the
 * machine past HOVERED, and releasing the pinch is the sole trigger that
 * confirms a trace. No transition may be skipped, and no non-gesture input
 * may mutate state directly.
 * IDLE -> HOVERED -> START_SELECTED -> TRACING -> CONFIRMING -> VALIDATED_*
 */
export function tickSelection(input: TickInput): SelectionSnapshot {
  const { snapshot, hoveredCell, isPinching, isFist } = input;
  const { state } = snapshot;

  // FIST cancels an in-progress selection from any active state back to IDLE.
  if (isFist && (state === 'START_SELECTED' || state === 'TRACING' || state === 'HOVERED')) {
    return initialSnapshot();
  }

  switch (state) {
    case 'IDLE': {
      if (hoveredCell) {
        return { state: 'HOVERED', hoveredCell, path: [], lockedDirection: null };
      }
      return snapshot;
    }

    case 'HOVERED': {
      if (!hoveredCell) return initialSnapshot();
      if (!vecEquals(hoveredCell, snapshot.hoveredCell!)) {
        return { state: 'HOVERED', hoveredCell, path: [], lockedDirection: null };
      }
      // Pinching down on the hovered letter begins the selection — the "pick".
      if (isPinching) {
        return { state: 'START_SELECTED', hoveredCell, path: [hoveredCell], lockedDirection: null };
      }
      return snapshot;
    }

    case 'START_SELECTED':
    case 'TRACING': {
      // Releasing the pinch at any point confirms the trace (checked by the hook layer).
      if (!isPinching) {
        return { ...snapshot, state: 'CONFIRMING' };
      }

      if (!hoveredCell) return { ...snapshot, state: 'TRACING' };

      const lastCell = snapshot.path[snapshot.path.length - 1];
      if (vecEquals(hoveredCell, lastCell)) return { ...snapshot, state: 'TRACING' };

      // Moving to a new adjacent cell while still pinching extends the path.
      const dirFromLast = normalizeDirection(lastCell, hoveredCell);
      if (!dirFromLast) return snapshot; // not a straight/diagonal step — ignore

      let lockedDirection = snapshot.lockedDirection;
      if (!lockedDirection) {
        // Direction locks once the second letter is chosen.
        lockedDirection = dirFromLast;
      } else if (dirFromLast.row !== lockedDirection.row || dirFromLast.col !== lockedDirection.col) {
        // Off-axis movement is ignored once direction is locked.
        return { ...snapshot, state: 'TRACING' };
      }

      const newPath = [...snapshot.path, hoveredCell];
      return { state: 'TRACING', hoveredCell, path: newPath, lockedDirection };
    }

    case 'CONFIRMING':
    case 'VALIDATED_SUCCESS':
    case 'VALIDATED_FAIL':
      // Terminal for this pass — the hook layer resets to IDLE after handling validation.
      return snapshot;

    default:
      return snapshot;
  }
}

export function withValidation(snapshot: SelectionSnapshot, success: boolean): SelectionSnapshot {
  return { ...snapshot, state: success ? 'VALIDATED_SUCCESS' : 'VALIDATED_FAIL' };
}

export type { SelectionState };
