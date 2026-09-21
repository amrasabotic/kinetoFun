import type { HoleResult } from '../systems/scoringEngine';
import { relativeToParLabel } from '../systems/scoringEngine';
import type { HoleDef } from '../types';

interface ScoreboardProps {
  holes: HoleDef[];
  results: HoleResult[];
  holeIndex: number;
  strokesThisHole: number;
}

export function Scoreboard({ holes, results, holeIndex, strokesThisHole }: ScoreboardProps) {
  return (
    <div className="gmg-scoreboard">
      {holes.map((hole, i) => {
        const result = results[i];
        const isCurrent = i === holeIndex;
        return (
          <div key={hole.id} className={`gmg-scoreboard__hole ${isCurrent ? 'gmg-scoreboard__hole--current' : ''}`}>
            <span className="gmg-scoreboard__num">Hole {i + 1}</span>
            <span className="gmg-scoreboard__par">Par {hole.par}</span>
            <span className="gmg-scoreboard__strokes">
              {result ? `${result.strokes} (${relativeToParLabel(result.strokes, result.par)})` : isCurrent ? strokesThisHole : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}
