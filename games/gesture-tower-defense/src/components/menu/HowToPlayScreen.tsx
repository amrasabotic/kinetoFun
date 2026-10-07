import HoverButton from '../common/HoverButton';

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: '☝️', title: 'Point', desc: 'Raise your hand to the camera. The dot on screen follows your index fingertip.' },
  { icon: '🤏', title: 'Build towers', desc: 'Pinch a tower in the tray, move it onto the field and open your fingers to drop it there. Towers cost coins.' },
  { icon: '🏰', title: 'Three towers', desc: 'Blaster (50) fires fast, Cannon (100) hits hard with splash damage, Frost (75) slows enemies down.' },
  { icon: '▶️', title: 'Start the wave', desc: 'When your defence is ready, hold your hand on Start Wave. Defeated enemies earn more coins.' },
  { icon: '❤️', title: 'Protect the base', desc: 'Enemies that reach the end of the path damage your base. Survive every wave to win.' },
  { icon: '🗑️', title: 'Sell', desc: 'Pinch a placed tower and drop it on the trash icon to get 60% of its cost back.' },
];

/** Shown first every time the game loads, and reopened from the main menu. */
export default function HowToPlayScreen({ onDone }: { onDone: () => void }) {
  return (
    <div className="td-screen td-menu">
      <h1 className="td-menu__title">How to Play</h1>
      <p className="td-menu__subtitle">Defend your base from every wave using only your hand.</p>
      <div className="td-howto">
        {STEPS.map((s) => (
          <div key={s.title} className="td-howto__card">
            <div className="td-howto__icon">{s.icon}</div>
            <div>
              <div className="td-howto__title">{s.title}</div>
              <div className="td-howto__text">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <HoverButton onActivate={onDone} dwellMs={900} ringColor="#38BDF8" className="td-menu-btn td-menu-btn--primary">
        Let&apos;s Play
      </HoverButton>
      <p className="td-howto__note">Point at a button and hold your hand still until the ring closes to press it.</p>
    </div>
  );
}
