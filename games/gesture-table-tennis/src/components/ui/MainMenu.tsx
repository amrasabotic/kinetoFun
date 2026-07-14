import { motion } from 'framer-motion';
import type { SaveData } from '../../types';

interface Props {
  save: SaveData;
  onPlay: () => void;
  onModes: () => void;
  onCosmetics: () => void;
  onStats: () => void;
  onSettings: () => void;
  onHowToPlay: () => void;
  onCredits: () => void;
}

const ITEM_V = { hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0 } };
const LIST_V = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export default function MainMenu({ save, onPlay, onModes, onCosmetics, onStats, onSettings, onHowToPlay, onCredits }: Props) {
  const btns = [
    { label: '▶  Play', onClick: onPlay, primary: true },
    { label: '🎮  Game Modes', onClick: onModes },
    { label: '🎨  Cosmetics', onClick: onCosmetics },
    { label: '📊  Statistics', onClick: onStats },
    { label: '⚙️  Settings', onClick: onSettings },
    { label: '📖  How To Play', onClick: onHowToPlay },
    { label: '🎖  Credits', onClick: onCredits },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
         style={{ background: 'radial-gradient(ellipse at 60% 40%, #2d0060 0%, #0a0014 60%)' }}>

      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{ width: 4 + (i % 5) * 2, height: 4 + (i % 5) * 2, left: `${(i * 19 + 5) % 95}%`, top: `${(i * 23 + 8) % 90}%`, background: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#22d3ee' : '#fbbf24', opacity: 0.35 }}
            animate={{ y: [-12, 12, -12], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Logo */}
      <motion.div className="text-center mb-8 z-10"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}>

        <motion.div className="text-7xl mb-4"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
          🏓
        </motion.div>
        <h1 className="text-5xl font-black tracking-tight"
            style={{ background: 'linear-gradient(135deg, #c084fc, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          GESTURE
        </h1>
        <h1 className="text-5xl font-black tracking-tight"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          TABLE TENNIS
        </h1>
        <p className="text-purple-300 text-lg mt-1 font-medium tracking-widest uppercase">Arena</p>
      </motion.div>

      {/* Coins indicator */}
      <motion.div className="z-10 mb-6 flex items-center gap-2 px-5 py-2 rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,215,0,0.3)' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}>
        <span className="text-2xl">🪙</span>
        <span className="text-yellow-300 font-bold text-xl">{save.coins.toLocaleString()}</span>
      </motion.div>

      {/* Menu buttons */}
      <motion.ul className="z-10 flex flex-col gap-3 w-72" variants={LIST_V} initial="hidden" animate="show">
        {btns.map(btn => (
          <motion.li key={btn.label} variants={ITEM_V}>
            <button
              onClick={btn.onClick}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-200 ${
                btn.primary
                  ? 'text-white shadow-lg shadow-purple-900/50 hover:shadow-purple-500/60 hover:scale-[1.03] active:scale-95'
                  : 'text-purple-100 hover:scale-[1.02] active:scale-95'
              }`}
              style={btn.primary
                ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: '1px solid rgba(167,139,250,0.4)' }
                : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }
              }>
              {btn.label}
            </button>
          </motion.li>
        ))}
      </motion.ul>

      {/* KinetoFun badge */}
      <motion.div className="absolute bottom-6 text-gray-500 text-sm font-medium tracking-wide z-10"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        KinetoFun © 2025
      </motion.div>
    </div>
  );
}
