import { AnimatedBackground } from './AnimatedBackground';
import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState } from '../types';

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: '🧪', title: 'The goal', desc: 'Sort the liquids so every tube holds a single colour. Empty tubes are fine.' },
  { icon: '🤏', title: 'Pour', desc: 'Pinch a tube to pick it up, move it over another tube and open your fingers to pour.' },
  { icon: '🎨', title: 'Pouring rule', desc: 'You can only pour onto the same colour, or into an empty tube, and only while there is room.' },
  { icon: '👍', title: 'Undo', desc: 'Give a thumbs-up to take back your last pour.' },
  { icon: '✌️', title: 'Hint', desc: 'Show a victory sign to see a good next move.' },
  { icon: '🖐️', title: 'Pause', desc: 'Hold an open palm still for 2 seconds to open the pause menu.' },
  { icon: '⭐', title: 'Stars', desc: 'Fewer pours, hints and undos earn more stars.' },
  { icon: '👉', title: 'Menus', desc: 'Point at a button and hold your hand still until it fills to press it.' },
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
