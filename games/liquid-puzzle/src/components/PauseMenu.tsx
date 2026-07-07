import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState } from '../types';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  gesture: GestureState;
}

export function PauseMenu({ onResume, onRestart, onExit, gesture }: PauseMenuProps) {
  return (
    <div className="lp-overlay">
      <div className="lp-overlay__panel">
        <h2 className="lp-overlay__title">Paused</h2>
        <p className="lp-overlay__hint">Hover a button to choose.</p>
        <DwellButton label="Resume" onActivate={onResume} className="lp-menu-btn lp-menu-btn--primary" />
        <DwellButton label="Restart Level" onActivate={onRestart} className="lp-menu-btn" />
        <DwellButton label="Exit to Menu" onActivate={onExit} className="lp-menu-btn lp-menu-btn--warn" />
      </div>
      <Cursor gesture={gesture} />
    </div>
  );
}
