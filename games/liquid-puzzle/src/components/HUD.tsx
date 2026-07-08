import { formatTime } from '../utils/helpers';
import type { GameMode } from '../types';

interface HUDProps {
  mode: GameMode;
  levelLabel: string;
  movesUsed: number;
  hintsUsed: number;
  undosUsed: number;
  elapsedSeconds: number;
  trackingLabel: string;
}

export function HUD({ mode, levelLabel, movesUsed, hintsUsed, undosUsed, elapsedSeconds, trackingLabel }: HUDProps) {
  return (
    <div className="lp-hud">
      <div className="lp-hud__left">
        <span className="lp-hud__badge">{mode.toUpperCase()}</span>
        <span className="lp-hud__level">{levelLabel}</span>
      </div>
      <div className="lp-hud__stats">
        <span className="lp-hud__stat">Moves {movesUsed}</span>
        <span className="lp-hud__stat">Hints {hintsUsed}</span>
        <span className="lp-hud__stat">Undo {undosUsed}</span>
        <span className="lp-hud__timer">{formatTime(elapsedSeconds)}</span>
      </div>
      <div className="lp-hud__right">
        <span className="lp-hud__tracking">{trackingLabel}</span>
      </div>
    </div>
  );
}
