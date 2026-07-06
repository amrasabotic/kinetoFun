import { useEffect, useRef } from 'react';
import { LetterCell } from './LetterCell';
import { PathCanvas } from './PathCanvas';
import type { PlacedWord, SelectionSnapshot } from '../types';
import type { Vec2 } from '../utils/directions';

interface GridProps {
  grid: string[][];
  size: number;
  selection: SelectionSnapshot;
  foundWords: PlacedWord[];
  onRectReady: (el: HTMLDivElement | null) => void;
}

function keyOf(v: Vec2) {
  return `${v.row}:${v.col}`;
}

export function Grid({ grid, size, selection, foundWords, onRectReady }: GridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onRectReady(containerRef.current);
    const handleResize = () => onRectReady(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onRectReady]);

  const pathSet = new Set(selection.path.map(keyOf));
  const foundSet = new Set(foundWords.flatMap((w) => w.cells.map(keyOf)));
  const isFail = selection.state === 'VALIDATED_FAIL';
  const isSuccess = selection.state === 'VALIDATED_SUCCESS';

  return (
    <div className="wsh-grid-wrapper">
      <div
        ref={containerRef}
        className="wsh-grid"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = `${r}:${c}`;
            const isHovered = selection.hoveredCell ? keyOf(selection.hoveredCell) === key : false;
            return (
              <LetterCell
                key={key}
                letter={letter}
                isHovered={isHovered}
                isInPath={pathSet.has(key) && !isSuccess && !isFail}
                isFound={foundSet.has(key) || (isSuccess && pathSet.has(key))}
                isFailFlash={isFail && pathSet.has(key)}
              />
            );
          }),
        )}
        <PathCanvas
          size={size}
          path={selection.path}
          color={isFail ? '#ff5c7a' : isSuccess ? '#4ade80' : '#a78bfa'}
          animated={selection.state === 'TRACING' || selection.state === 'START_SELECTED'}
        />
      </div>
    </div>
  );
}
