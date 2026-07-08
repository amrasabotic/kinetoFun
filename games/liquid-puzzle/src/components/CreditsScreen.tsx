import { AnimatedBackground } from './AnimatedBackground';
import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState } from '../types';

export function CreditsScreen({ onBack, gesture }: { onBack: () => void; gesture: GestureState }) {
  return (
    <div className="lp-screen">
      <AnimatedBackground />
      <div className="lp-panel lp-panel--narrow">
        <h2 className="lp-screen__title">Credits</h2>
        <p className="lp-credits__line">Liquid Puzzle</p>
        <p className="lp-credits__line lp-credits__line--muted">A gesture-only water-sorting puzzle for KinetoFun.</p>
        <p className="lp-credits__line lp-credits__line--muted">Built with MediaPipe Hands, React, and Framer Motion.</p>
        <p className="lp-credits__line lp-credits__line--muted">No mouse. No keyboard. No touch. Just your hand.</p>
        <DwellButton label="Back" onActivate={onBack} className="lp-menu-btn lp-menu-btn--warn" />
      </div>
      <Cursor gesture={gesture} />
    </div>
  );
}
