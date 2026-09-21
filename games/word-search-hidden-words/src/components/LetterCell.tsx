import { memo } from 'react';

interface LetterCellProps {
  letter: string;
  isHovered: boolean;
  isInPath: boolean;
  isFound: boolean;
  isFailFlash: boolean;
}

function LetterCellImpl({ letter, isHovered, isInPath, isFound, isFailFlash }: LetterCellProps) {
  const classes = [
    'wsh-cell',
    isHovered && 'wsh-cell--hover',
    isInPath && 'wsh-cell--path',
    isFound && 'wsh-cell--found',
    isFailFlash && 'wsh-cell--fail',
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{letter}</div>;
}

export const LetterCell = memo(LetterCellImpl);
