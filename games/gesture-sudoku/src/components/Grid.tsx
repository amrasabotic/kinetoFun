import { useEffect, useRef } from 'react';
import type { CellPos, Grid as GridType } from '../types';

interface GridProps {
  grid: GridType;
  selected: CellPos | null;
  hovered: CellPos | null;
  conflicts: Set<string>;
  onRectReady: (el: HTMLDivElement | null) => void;
}

export function Grid({ grid, selected, hovered, conflicts, onRectReady }: GridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onRectReady(containerRef.current);
    const handleResize = () => onRectReady(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onRectReady]);

  return (
    <div ref={containerRef} className="gsd-grid">
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r}:${c}`;
          const isSelected = selected?.row === r && selected?.col === c;
          const isHovered = hovered?.row === r && hovered?.col === c;
          const isConflict = conflicts.has(key);
          const classes = [
            'gsd-cell',
            cell.isClue ? 'gsd-cell--clue' : 'gsd-cell--entry',
            isSelected && 'gsd-cell--selected',
            isHovered && !isSelected && 'gsd-cell--hover',
            isConflict && 'gsd-cell--conflict',
            c % 3 === 0 && 'gsd-cell--box-left',
            r % 3 === 0 && 'gsd-cell--box-top',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={key} className={classes}>
              {cell.value ?? ''}
            </div>
          );
        }),
      )}
    </div>
  );
}
