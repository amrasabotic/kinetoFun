import type { Frame } from '../systems/scoringEngine';

interface ScoreboardProps {
  frames: Frame[];
  currentFrameIndex: number;
}

function frameSymbol(frame: Frame, frameIdx: number): string {
  if (frame.rolls.length === 0) return '';
  if (frameIdx < 9) {
    if (frame.isStrike) return 'X';
    if (frame.rolls.length === 1) return `${frame.rolls[0]}`;
    if (frame.isSpare) return `${frame.rolls[0]} /`;
    return `${frame.rolls[0]} ${frame.rolls[1]}`;
  }
  // 10th frame: render each ball, using X/ / shorthand where it applies.
  return frame.rolls
    .map((r, i) => {
      if (r === 10) return 'X';
      if (i > 0) {
        const prev = frame.rolls[i - 1];
        if (prev !== 10 && prev + r === 10) return '/';
      }
      return `${r}`;
    })
    .join(' ');
}

export function Scoreboard({ frames, currentFrameIndex }: ScoreboardProps) {
  return (
    <div className="gbl-scoreboard">
      {Array.from({ length: 10 }).map((_, i) => {
        const frame = frames[i];
        const isCurrent = i === currentFrameIndex;
        return (
          <div key={i} className={`gbl-scoreboard__frame ${isCurrent ? 'gbl-scoreboard__frame--current' : ''}`}>
            <span className="gbl-scoreboard__num">{i + 1}</span>
            <span className="gbl-scoreboard__rolls">{frame ? frameSymbol(frame, i) : ''}</span>
            <span className="gbl-scoreboard__cum">{frame?.cumulative ?? ''}</span>
          </div>
        );
      })}
    </div>
  );
}
