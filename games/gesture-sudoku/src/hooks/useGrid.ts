import { useCallback, useRef } from 'react';
import type { CellPos } from '../types';
import { GRID_SIZE } from '../types';

/**
 * Tracks the on-screen rect of the grid element and converts normalized
 * (0..1) gesture cursor coordinates into 9x9 cell indices.
 */
export function useGrid() {
  const rectRef = useRef<DOMRect | null>(null);

  const refreshRect = useCallback((el: HTMLDivElement | null) => {
    if (el) rectRef.current = el.getBoundingClientRect();
  }, []);

  const cellFromCursor = useCallback((cursorX: number, cursorY: number): CellPos | null => {
    const rect = rectRef.current;
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const originXNorm = rect.left / window.innerWidth;
    const originYNorm = rect.top / window.innerHeight;
    const sizeXNorm = rect.width / window.innerWidth;
    const sizeYNorm = rect.height / window.innerHeight;
    const localX = cursorX - originXNorm;
    const localY = cursorY - originYNorm;
    if (localX < 0 || localY < 0 || localX >= sizeXNorm || localY >= sizeYNorm) return null;
    const col = Math.floor((localX / sizeXNorm) * GRID_SIZE);
    const row = Math.floor((localY / sizeYNorm) * GRID_SIZE);
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }, []);

  return { refreshRect, cellFromCursor };
}
