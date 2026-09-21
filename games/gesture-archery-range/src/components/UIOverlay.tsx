import type { Difficulty, GameMode, RoundConfig } from '../types';
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
    <div ref={elRef} className={`gar-dwell-btn ${className ?? ''}`}>
      <div className="gar-dwell-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

interface UIOverlayProps {
  mode: GameMode;
  difficulty: Difficulty;
  score: number;
  arrowsLeft: number;
  config: RoundConfig;
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
  arrowsLeft,
  config,
  elapsedSeconds,
  onPauseToggle,
  onRestart,
  onExit,
  paused,
  gestureCursor,
  trackingLabel,
}: UIOverlayProps) {
  return (
    <div className="gar-ui-overlay">
      <div className="gar-hud">
        <span className="gar-hud__badge">
          {mode.toUpperCase()} · {difficulty.toUpperCase()}
        </span>
        <span className="gar-hud__stat">Score {score}</span>
        <span className="gar-hud__stat">Arrows {arrowsLeft}</span>
        {config.windStrength > 0 && (
          <span className="gar-hud__stat">Wind {Math.round(config.windStrength * 100)}%</span>
        )}
        {mode !== 'zen' && <span className="gar-hud__timer">{formatTime(elapsedSeconds)}</span>}
        <span className="gar-hud__tracking">{trackingLabel}</span>
      </div>

      <div className="gar-button-row">
        <DwellButton label={paused ? 'Resume' : 'Pause'} holdMs={500} onActivate={onPauseToggle} />
        <DwellButton label="Restart" holdMs={800} onActivate={onRestart} className="gar-dwell-btn--warn" />
        <DwellButton label="Exit" holdMs={800} onActivate={onExit} className="gar-dwell-btn--warn" />
      </div>

      {gestureCursor && (
        <div
          className="gar-cursor-dot"
          style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }}
        />
      )}
    </div>
  );
}
