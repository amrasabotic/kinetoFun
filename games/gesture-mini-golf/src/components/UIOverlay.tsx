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
    <div ref={elRef} className={`gmg-dwell-btn ${className ?? ''}`}>
      <div className="gmg-dwell-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

interface UIOverlayProps {
  mode: GameMode;
  difficulty: Difficulty;
  totalScore: number;
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
  totalScore,
  elapsedSeconds,
  onPauseToggle,
  onRestart,
  onExit,
  paused,
  gestureCursor,
  trackingLabel,
}: UIOverlayProps) {
  return (
    <div className="gmg-ui-overlay">
      <div className="gmg-hud">
        <span className="gmg-hud__badge">
          {mode.toUpperCase()} · {difficulty.toUpperCase()}
        </span>
        <span className="gmg-hud__stat">Strokes {totalScore}</span>
        {mode !== 'zen' && <span className="gmg-hud__timer">{formatTime(elapsedSeconds)}</span>}
        <span className="gmg-hud__tracking">{trackingLabel}</span>
      </div>

      <div className="gmg-button-row">
        <DwellButton label={paused ? 'Resume' : 'Pause'} holdMs={500} onActivate={onPauseToggle} />
        <DwellButton label="Restart" holdMs={800} onActivate={onRestart} className="gmg-dwell-btn--warn" />
        <DwellButton label="Exit" holdMs={800} onActivate={onExit} className="gmg-dwell-btn--warn" />
      </div>

      {gestureCursor && (
        <div
          className="gmg-cursor-dot"
          style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }}
        />
      )}
    </div>
  );
}
