import { useEffect, useRef, useState } from 'react';
import type { CellPos } from '../types';
import { useGestureRef } from './useGesture';

interface UseCellSelectOptions {
  cellFromCursor: (x: number, y: number) => CellPos | null;
  onSelect: (cell: CellPos) => void;
}

/**
 * Hover a cell, pinch down to select it — a tap, not a drag, since Sudoku
 * has no path to trace. Much simpler than Word Search's full selection
 * state machine because there's only one meaningful transition: pinch-down
 * while hovering fires a selection, and the pinch has to fully release
 * before another selection can fire (so holding a pinch through several
 * cells doesn't rapid-fire selections).
 */
export function useCellSelect({ cellFromCursor, onSelect }: UseCellSelectOptions) {
  const gestureRef = useGestureRef();
  const [hoveredCell, setHoveredCell] = useState<CellPos | null>(null);
  const wasPinchingRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    function loop() {
      const gesture = gestureRef.current;
      const cell = gesture.isHovering ? cellFromCursor(gesture.cursorX, gesture.cursorY) : null;
      setHoveredCell((prev) => (prev?.row === cell?.row && prev?.col === cell?.col ? prev : cell));

      if (gesture.isPinching && !wasPinchingRef.current && cell) {
        onSelect(cell);
      }
      wasPinchingRef.current = gesture.isPinching;

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cellFromCursor, onSelect, gestureRef]);

  return { hoveredCell };
}
