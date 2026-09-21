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
    <div ref={elRef} className={`gbl-dwell-btn ${className ?? ''}`}>
      <div className="gbl-dwell-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

interface UIOverlayProps {
  mode: GameMode;
  difficulty: Difficulty;
  score: number;
  elapsedSeconds: number;
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
  score,
  elapsedSeconds,
  onPauseToggle,
  onRestart,
  onExit,
  paused,
  gestureCursor,
  trackingLabel,
}: UIOverlayProps) {
  return (
    <div className="gbl-ui-overlay">
      <div className="gbl-hud">
        <span className="gbl-hud__badge">
          {mode.toUpperCase()} · {difficulty.toUpperCase()}
        </span>
        <span className="gbl-hud__stat">Score {score}</span>
        {mode !== 'zen' && <span className="gbl-hud__timer">{formatTime(elapsedSeconds)}</span>}
        <span className="gbl-hud__tracking">{trackingLabel}</span>
      </div>

      <div className="gbl-button-row">
        <DwellButton label={paused ? 'Resume' : 'Pause'} holdMs={500} onActivate={onPauseToggle} />
        <DwellButton label="Restart" holdMs={800} onActivate={onRestart} className="gbl-dwell-btn--warn" />
        <DwellButton label="Exit" holdMs={800} onActivate={onExit} className="gbl-dwell-btn--warn" />
      </div>

      {gestureCursor && (
        <div
          className="gbl-cursor-dot"
          style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }}
        />
      )}
    </div>
  );
}
