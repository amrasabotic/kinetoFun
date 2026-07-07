import type { Difficulty, GameMode } from '../types';
import type { TurnPhase } from '../systems/matchEngine';
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
    <div ref={elRef} className={`gdt-dwell-btn ${className ?? ''}`}>
      <div className="gdt-dwell-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

interface UIOverlayProps {
  mode: GameMode;
  difficulty: Difficulty;
  phase: TurnPhase;
  dartsThisTurn: number;
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
  phase,
  dartsThisTurn,
  onPauseToggle,
  onRestart,
  onExit,
  paused,
  gestureCursor,
  trackingLabel,
}: UIOverlayProps) {
  return (
    <div className="gdt-ui-overlay">
      <div className="gdt-hud">
        <span className="gdt-hud__badge">
          {mode.toUpperCase()} · {difficulty.toUpperCase()}
        </span>
        <span className="gdt-hud__stat">{phase === 'CPU_TURN' ? "CPU's turn" : 'Your turn'}</span>
        <span className="gdt-hud__stat">Dart {Math.min(dartsThisTurn + 1, 3)} / 3</span>
        <span className="gdt-hud__tracking">{trackingLabel}</span>
      </div>

      <div className="gdt-button-row">
        <DwellButton label={paused ? 'Resume' : 'Pause'} holdMs={500} onActivate={onPauseToggle} />
        <DwellButton label="Restart" holdMs={800} onActivate={onRestart} className="gdt-dwell-btn--warn" />
        <DwellButton label="Exit" holdMs={800} onActivate={onExit} className="gdt-dwell-btn--warn" />
      </div>

      {gestureCursor && (
        <div
          className="gdt-cursor-dot"
          style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }}
        />
      )}
    </div>
  );
}
