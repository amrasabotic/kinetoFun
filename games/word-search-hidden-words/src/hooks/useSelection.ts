import { useEffect, useRef, useState, useCallback } from 'react';
import type { SelectionSnapshot } from '../types';
import type { Vec2 } from '../utils/directions';
import { initialSnapshot, tickSelection } from '../systems/selectionEngine';
import { useGestureRef } from './useGesture';

interface UseSelectionOptions {
  cellFromCursor: (x: number, y: number) => Vec2 | null;
  onWordConfirmed: (path: Vec2[]) => boolean; // returns true if the traced word validated
}

/**
 * Drives the gesture selection state machine every animation frame. This is
 * the only place gesture input is allowed to mutate selection state — UI
 * components only read the resulting snapshot. Index finger moves the
 * cursor; pinching down ("pick") starts/extends a trace; releasing the
 * pinch confirms it.
 */
export function useSelection({ cellFromCursor, onWordConfirmed }: UseSelectionOptions) {
  const [snapshot, setSnapshot] = useState<SelectionSnapshot>(initialSnapshot());
  const gestureRef = useGestureRef();
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const rafRef = useRef(0);
  const flashTimeoutRef = useRef<number | undefined>(undefined);

  const cancelSelection = useCallback(() => {
    setSnapshot(initialSnapshot());
  }, []);

  useEffect(() => {
    function loop() {
      const gesture = gestureRef.current;
      const hoveredCell = gesture.isHovering ? cellFromCursor(gesture.cursorX, gesture.cursorY) : null;

      const current = snapshotRef.current;
      if (current.state !== 'CONFIRMING' && current.state !== 'VALIDATED_SUCCESS' && current.state !== 'VALIDATED_FAIL') {
        const next = tickSelection({
          snapshot: current,
          hoveredCell,
          isPinching: gesture.isPinching,
          isFist: gesture.isFist,
        });
        if (next !== current) setSnapshot(next);
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cellFromCursor, gestureRef]);

  // Handle CONFIRMING -> VALIDATED_* -> reset, outside the RAF loop so React state updates settle.
  useEffect(() => {
    if (snapshot.state !== 'CONFIRMING') return;
    if (snapshot.path.length < 2) {
      // A pinch that was released before tracing a second letter isn't a real attempt.
      setSnapshot(initialSnapshot());
      return;
    }
    const success = onWordConfirmed(snapshot.path);
    setSnapshot({ ...snapshot, state: success ? 'VALIDATED_SUCCESS' : 'VALIDATED_FAIL' });
  }, [snapshot, onWordConfirmed]);

  useEffect(() => {
    if (snapshot.state !== 'VALIDATED_SUCCESS' && snapshot.state !== 'VALIDATED_FAIL') return;
    window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => {
      setSnapshot(initialSnapshot());
    }, 500);
    return () => window.clearTimeout(flashTimeoutRef.current);
  }, [snapshot.state]);

  return { selection: snapshot, cancelSelection };
}
