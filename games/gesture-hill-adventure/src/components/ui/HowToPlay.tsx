/** How-to-play screen with animated gesture illustrations. */
import { motion } from 'framer-motion';
import { playUiClick } from '../../game/audio/audioSystem';

interface Props { onBack: () => void; }

const GESTURES = [
  {
    icon:  '⬆️',
    title: 'Raise Hand → Accelerate',
    desc:  'Lift your palm above the centre of the frame. The higher your hand, the more throttle.',
    color: '#69F0AE',
    anim:  { y: [0, -12, 0] },
  },
  {
    icon:  '⬇️',
    title: 'Lower Hand → Brake',
    desc:  'Drop your palm below the centre of the frame to slow down or reverse.',
    color: '#FF5252',
    anim:  { y: [0, 12, 0] },
  },
  {
    icon:  '✊',
    title: 'Fist → BOOST!',
    desc:  'Close all fingers into a fist to activate a 1-second speed burst. 5-second cooldown applies.',
    color: '#FF6D00',
    anim:  { scale: [1, 1.2, 1] },
  },
  {
    icon:  '✋',
    title: 'Open Palm → Neutral / Coast',
    desc:  'Keep your palm level in the centre zone to coast without braking.',
    color: '#64B5F6',
    anim:  { rotate: [-5, 5, -5] },
  },
];

const TIPS = [
  { icon: '🪙', text: 'Coins appear above hills and in valleys — take risks for more rewards!' },
  { icon: '⚡', text: 'Fuel cans appear every ~400m. Running out = game over!' },
  { icon: '🔄', text: 'Get airborne and rotate to pull off flips for huge bonus points.' },
  { icon: '🎯', text: 'Land smoothly (low downward velocity) for Perfect Landing bonus.' },
  { icon: '⏱️', text: 'Stay airborne as long as possible for Air Time bonuses.' },
  { icon: '🌍', text: 'The world changes theme every 1200m — six environments in total.' },
];

export default function HowToPlay({ onBack }: Props) {
  return (
    <div
      className="h-screen w-full overflow-y-auto relative"
      style={{ background: 'linear-gradient(160deg,#0b0e1a,#1a1040)' }}
    >
      <div className="min-h-full flex flex-col items-center justify-center px-8 py-6 gap-5">
      <h2 className="text-5xl font-black text-white">How To Play</h2>

      <div className="w-full max-w-6xl grid grid-cols-4 gap-4">
        {GESTURES.map((g, i) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex flex-col items-center text-center gap-2 rounded-2xl p-5"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${g.color}44` }}
          >
            <motion.div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
              style={{ background: `${g.color}22`, border: `2px solid ${g.color}66` }}
              animate={g.anim as object}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {g.icon}
            </motion.div>
            <p className="font-bold text-base" style={{ color: g.color }}>{g.title}</p>
            <p className="text-white/70 text-sm leading-snug">{g.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-6xl">
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Pro Tips</h3>
        <div className="grid grid-cols-3 gap-3">
          {TIPS.map((t, i) => (
            <div key={i} className="flex gap-3 items-start rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <span className="text-xl shrink-0">{t.icon}</span>
              <p className="text-white/75 text-sm leading-snug">{t.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl">
        <button
          onClick={() => { playUiClick(); onBack(); }}
          className="px-16 py-4 rounded-2xl text-white text-xl font-black"
          style={{
            background: 'linear-gradient(135deg,#FF6B35 0%,#FF8F00 100%)',
            border: '1.5px solid rgba(255,180,50,0.6)',
            boxShadow: '0 6px 28px rgba(255,107,53,0.45)',
          }}
        >
          ▶ Let's Play
        </button>
      </div>
      <p className="text-white/50 text-sm -mt-2">Hold your hand over the button</p>
      </div>
    </div>
  );
}
