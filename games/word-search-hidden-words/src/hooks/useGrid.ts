import { useCallback, useRef } from 'react';
import type { Vec2 } from '../utils/directions';
import { cursorToCell } from '../systems/gridEngine';

/**
 * Tracks the on-screen rect of the grid element and converts normalized
 * (0..1) gesture cursor coordinates into grid cell indices.
 */
export function useGrid(cellCount: number) {
  const rectRef = useRef<DOMRect | null>(null);

  const bindGridRef = useCallback((el: HTMLDivElement | null) => {
    rectRef.current = el ? el.getBoundingClientRect() : null;
  }, []);

  const refreshRect = useCallback((el: HTMLDivElement | null) => {
    if (el) rectRef.current = el.getBoundingClientRect();
  }, []);

  const cellFromCursor = useCallback(
    (cursorX: number, cursorY: number): Vec2 | null => {
      const rect = rectRef.current;
      if (!rect || rect.width === 0 || rect.height === 0) return null;
      const originXNorm = rect.left / window.innerWidth;
      const originYNorm = rect.top / window.innerHeight;
      const sizeXNorm = rect.width / window.innerWidth;
      const sizeYNorm = rect.height / window.innerHeight;
      // Grid cells are square in layout, so use X-axis scale consistently for both axes
      // by mapping Y through the same normalized box (rect is square in practice).
      const localX = cursorX - originXNorm;
      const localY = cursorY - originYNorm;
      if (localX < 0 || localY < 0 || localX >= sizeXNorm || localY >= sizeYNorm) return null;
      const col = Math.floor((localX / sizeXNorm) * cellCount);
      const row = Math.floor((localY / sizeYNorm) * cellCount);
      if (row < 0 || row >= cellCount || col < 0 || col >= cellCount) return null;
      return { row, col };
    },
    [cellCount],
  );

  return { bindGridRef, refreshRect, cellFromCursor };
}

export { cursorToCell };
