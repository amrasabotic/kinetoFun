import { AnimatedBackground } from './AnimatedBackground';
import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState } from '../types';

interface MainMenuProps {
  onPlay: () => void;
  onLevelSelect: () => void;
  onEndless: () => void;
  onDaily: () => void;
  onStatistics: () => void;
  onSettings: () => void;
  onCredits: () => void;
  dailyDone: boolean;
  gesture: GestureState;
}

export function MainMenu({ onPlay, onLevelSelect, onEndless, onDaily, onStatistics, onSettings, onCredits, dailyDone, gesture }: MainMenuProps) {
  return (
    <div className="lp-screen">
      <AnimatedBackground />
      <div className="lp-menu">
        <h1 className="lp-menu__title">Liquid Puzzle</h1>
        <p className="lp-menu__subtitle">Sort every color into its own tube — pinch to grab a tube, drag it over another to pour.</p>

        <div className="lp-menu__grid">
          <DwellButton label="Play" onActivate={onPlay} className="lp-menu-btn lp-menu-btn--primary" />
          <DwellButton label="Level Select" onActivate={onLevelSelect} className="lp-menu-btn" />
          <DwellButton label="Endless Mode" onActivate={onEndless} className="lp-menu-btn" />
          <DwellButton label={dailyDone ? 'Daily Challenge ✓' : 'Daily Challenge'} onActivate={onDaily} className="lp-menu-btn" />
          <DwellButton label="Statistics" onActivate={onStatistics} className="lp-menu-btn" />
          <DwellButton label="Settings" onActivate={onSettings} className="lp-menu-btn" />
          <DwellButton label="Credits" onActivate={onCredits} className="lp-menu-btn" />
        </div>
      </div>
      <Cursor gesture={gesture} />
    </div>
  );
}
