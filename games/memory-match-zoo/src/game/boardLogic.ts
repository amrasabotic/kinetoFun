import type { BoardSize } from '../types';

export function pairCountForSize(size: BoardSize): number {
  if (size === 'small') return 3;
  if (size === 'medium') return 6;
  return 8; // big
}

export function gridDimsForSize(size: BoardSize): { cols: number; rows: number } {
  if (size === 'small') return { cols: 3, rows: 2 };
  if (size === 'medium') return { cols: 4, rows: 3 };
  return { cols: 4, rows: 4 }; // big
}
