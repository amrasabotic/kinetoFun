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
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0b0e1a,#1a1040)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { playUiClick(); onBack(); }}
          className="glass rounded-xl px-4 py-2 text-white font-bold text-sm"
        >
          ← Back
        </motion.button>
        <h2 className="text-2xl font-black text-white">How To Play</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
        {/* Gesture controls */}
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Hand Gestures</h3>
        {GESTURES.map((g, i) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex gap-4 rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${g.color}33` }}
          >
            <motion.div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: `${g.color}22`, border: `2px solid ${g.color}66` }}
              animate={g.anim as object}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {g.icon}
            </motion.div>
            <div>
              <p className="text-white font-bold text-sm" style={{ color: g.color }}>{g.title}</p>
              <p className="text-white/60 text-xs leading-relaxed mt-0.5">{g.desc}</p>
            </div>
          </motion.div>
        ))}

        {/* Camera setup tip */}
        <div className="rounded-2xl p-4 flex gap-3"
          style={{ background: 'rgba(100,181,246,0.1)', border: '1.5px solid rgba(100,181,246,0.3)' }}>
          <div className="text-2xl">📷</div>
          <div>
            <p className="text-blue-300 font-bold text-sm">Camera Setup</p>
            <p className="text-white/60 text-xs leading-relaxed mt-0.5">
              Allow camera access. Sit ~60cm from the camera so your full hand is visible.
              Good lighting = better tracking.
            </p>
          </div>
        </div>

        {/* Tips */}
        <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mt-2">Pro Tips</h3>
        <div className="space-y-2">
          {TIPS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="flex gap-3 items-start rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <span className="text-lg shrink-0">{t.icon}</span>
              <p className="text-white/70 text-xs leading-relaxed">{t.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
