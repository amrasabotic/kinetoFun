import type { Difficulty, GameMode } from '../types';
import { formatTime } from '../utils/helpers';
import { useDwellButton } from '../hooks/useDwellButton';

interface DwellButtonProps {
  label: string;
  holdMs: number;
  onActivate: () => void;
  className?: string;
}

function DwellButton({ label, holdMs, onActivate, className }: DwellButtonProps) {
  const { elRef, progress } = useDwellButton(holdMs, onActivate);
  return (
    <div ref={elRef} className={`gsd-dwell-btn ${className ?? ''}`}>
      <div className="gsd-dwell-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

interface UIOverlayProps {
  mode: GameMode;
  difficulty: Difficulty;
  filledCount: number;
  elapsedSeconds: number;
  timeLimitSeconds: number | null;
  onHint: () => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  onExit: () => void;
  paused: boolean;
  gestureCursor: { x: number; y: number } | null;
  trackingLabel: string;
}

export function UIOverlay({
  mode,
  difficulty,
  filledCount,
  elapsedSeconds,
  timeLimitSeconds,
  onHint,
  onPauseToggle,
  onRestart,
  onExit,
  paused,
  gestureCursor,
  trackingLabel,
}: UIOverlayProps) {
  const remaining = timeLimitSeconds !== null ? Math.max(0, timeLimitSeconds - elapsedSeconds) : null;

  return (
    <div className="gsd-ui-overlay">
      <div className="gsd-hud">
        <span className="gsd-hud__badge">
          {mode.toUpperCase()} · {difficulty.toUpperCase()}
        </span>
        <span className="gsd-hud__stat">{filledCount}/81 filled</span>
        {remaining !== null ? (
          <span className="gsd-hud__timer">{formatTime(remaining)}</span>
        ) : mode !== 'zen' ? (
          <span className="gsd-hud__timer">{formatTime(elapsedSeconds)}</span>
        ) : null}
        <span className="gsd-hud__tracking">{trackingLabel}</span>
      </div>

      <div className="gsd-button-row">
        <DwellButton label="Hint" holdMs={500} onActivate={onHint} />
        <DwellButton label={paused ? 'Resume' : 'Pause'} holdMs={500} onActivate={onPauseToggle} />
        <DwellButton label="Restart" holdMs={800} onActivate={onRestart} className="gsd-dwell-btn--warn" />
        <DwellButton label="Exit" holdMs={800} onActivate={onExit} className="gsd-dwell-btn--warn" />
      </div>

      {gestureCursor && (
        <div
          className="gsd-cursor-dot"
          style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }}
        />
      )}
    </div>
  );
}
