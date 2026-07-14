import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { useProgressStore } from '../../stores/progressStore';

export type MainMenuAction = 'play' | 'practice' | 'world-tour' | 'endless' | 'gallery' | 'settings' | 'exit';

const ITEMS: { action: MainMenuAction; label: string; icon: string; color: string }[] = [
  { action: 'play', label: 'Play', icon: '▶', color: '#8C5CFF' },
  { action: 'practice', label: 'Practice', icon: '✎', color: '#2FA35A' },
  { action: 'world-tour', label: 'World Tour', icon: '🌍', color: '#2A5CD6' },
  { action: 'endless', label: 'Endless', icon: '∞', color: '#F07A26' },
  { action: 'gallery', label: 'Gallery', icon: '🖼', color: '#F4C430' },
  { action: 'settings', label: 'Settings', icon: '⚙', color: '#8A5A34' },
  { action: 'exit', label: 'Exit', icon: '✕', color: '#E4362E' },
];

export default function MainMenu({ onSelect }: { onSelect: (a: MainMenuAction) => void }) {
  const totalStars = useProgressStore((s) => s.totalStars);
  const flagsCompleted = useProgressStore((s) => s.flagsCompleted.length);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#1a1140] via-[#160b30] to-[#0b0620] flex flex-col items-center justify-center text-white px-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-white to-sky-300">
          Flag Quest
        </h1>
        <p className="text-white/50 mt-1 text-lg">World Colors</p>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-white/60">
          <span>⭐ {totalStars} stars</span>
          <span>🏳 {flagsCompleted} flags completed</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-4 gap-5 max-w-3xl">
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.action}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <HoverButton
              onActivate={() => onSelect(item.action)}
              ringColor={item.color}
              className="flex flex-col items-center justify-center gap-2 w-32 h-28 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10"
            >
              <span className="text-3xl" style={{ color: item.color }}>{item.icon}</span>
              <span className="text-sm font-semibold text-white/90">{item.label}</span>
            </HoverButton>
          </motion.div>
        ))}
      </div>

      <p className="mt-10 text-xs text-white/30">Hover a tile with your fingertip for a moment to select it</p>
    </div>
  );
}
