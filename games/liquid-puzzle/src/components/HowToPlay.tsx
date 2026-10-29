import { AnimatedBackground } from './AnimatedBackground';
import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState } from '../types';

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: '🧪', title: 'The goal', desc: 'Sort the liquids so each tube holds one colour.' },
  { icon: '✋', title: 'Pour', desc: 'Hold your hand on a tube to lift it, then hold on another tube to pour.' },
  { icon: '🎨', title: 'Rule', desc: 'Pour only onto the same colour or into an empty tube.' },
  { icon: '👍', title: 'Undo and hint', desc: 'Thumbs-up undoes a pour; a victory sign ✌️ shows a hint.' },
  { icon: '⏸️', title: 'Pause', desc: 'Hold your hand on the Pause button.' },
  { icon: '⭐', title: 'Stars', desc: 'Fewer pours, hints and undos earn more stars.' },
];

/** Shown first every time the game loads (after calibration), and reopened from the main menu. */
export function HowToPlay({ onDone, gesture }: { onDone: () => void; gesture: GestureState }) {
  return (
    <div className="lp-screen">
      <AnimatedBackground />
      <div className="lp-menu">
        <h1 className="lp-menu__title">How to Play</h1>
        <div className="lp-howto">
          {STEPS.map((s) => (
            <div key={s.title} className="lp-howto__card">
              <div className="lp-howto__icon">{s.icon}</div>
              <div>
                <div className="lp-howto__title">{s.title}</div>
                <div className="lp-howto__text">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <DwellButton label="Let's Play" holdMs={900} onActivate={onDone} className="lp-menu-btn lp-menu-btn--primary" />
      </div>
      <Cursor gesture={gesture} />
    </div>
  );
}
