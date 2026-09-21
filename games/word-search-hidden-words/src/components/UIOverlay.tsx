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
    <div ref={elRef} className={`wsh-dwell-btn ${className ?? ''}`}>
      <div className="wsh-dwell-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

interface UIOverlayProps {
  mode: GameMode;
  difficulty: Difficulty;
  foundCount: number;
  totalCount: number;
  elapsedSeconds: number;
  timeLimitSeconds: number | null;
  onHint: () => void;
  onRestart: () => void;
  onPauseToggle: () => void;
  onExit: () => void;
  paused: boolean;
  gestureCursor: { x: number; y: number } | null;
  trackingLabel: string;
}

export function UIOverlay({
  mode,
  difficulty,
  foundCount,
  totalCount,
  elapsedSeconds,
  timeLimitSeconds,
  onHint,
  onRestart,
  onPauseToggle,
  onExit,
  paused,
  gestureCursor,
  trackingLabel,
}: UIOverlayProps) {
  const remaining = timeLimitSeconds !== null ? Math.max(0, timeLimitSeconds - elapsedSeconds) : null;

  return (
    <div className="wsh-ui-overlay">
      <div className="wsh-hud">
        <span className="wsh-hud__badge">
          {mode.toUpperCase()} · {difficulty.toUpperCase()}
        </span>
        <span className="wsh-hud__progress">
          {foundCount}/{totalCount} found
        </span>
        {remaining !== null ? (
          <span className="wsh-hud__timer">{formatTime(remaining)}</span>
        ) : mode !== 'zen' ? (
          <span className="wsh-hud__timer">{formatTime(elapsedSeconds)}</span>
        ) : null}
        <span className="wsh-hud__tracking">{trackingLabel}</span>
      </div>

      <div className="wsh-button-row">
        <DwellButton label="Hint" holdMs={500} onActivate={onHint} />
        <DwellButton label={paused ? 'Resume' : 'Pause'} holdMs={500} onActivate={onPauseToggle} />
        <DwellButton label="Restart" holdMs={800} onActivate={onRestart} className="wsh-dwell-btn--warn" />
        <DwellButton label="Exit" holdMs={800} onActivate={onExit} className="wsh-dwell-btn--warn" />
      </div>

      {gestureCursor && (
        <div
          className="wsh-cursor-dot"
          style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }}
        />
      )}
    </div>
  );
}
