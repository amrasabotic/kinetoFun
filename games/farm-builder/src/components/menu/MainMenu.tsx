import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { useFarmStore } from '../../stores/farmStore';
import { MAX_PLOT_COUNT } from '../../data/crops';

export type MainMenuAction = 'enter-farm' | 'settings' | 'exit';

const ITEMS: { action: MainMenuAction; label: string; emoji: string; color: string }[] = [
  { action: 'enter-farm', label: 'Enter Farm', emoji: '🚜', color: '#2FA35A' },
  { action: 'settings', label: 'Settings', emoji: '⚙️', color: '#4A90D9' },
  { action: 'exit', label: 'Exit', emoji: '👋', color: '#9B4FD6' },
];

export default function MainMenu({ onSelect }: { onSelect: (a: MainMenuAction) => void }) {
  const coins = useFarmStore((s) => s.coins);
  const totalHarvests = useFarmStore((s) => s.totalHarvests);
  const unlockedPlotCount = useFarmStore((s) => s.unlockedPlotCount);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2a5e1a] via-[#1e4a16] to-[#0f2410] flex flex-col items-center justify-center text-white px-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4 flex items-center gap-4">
        <div className="scs-bob text-6xl">🚜</div>
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-200 via-white to-yellow-200">
            Little Farm Builder
          </h1>
          <p className="text-white/50 mt-1 text-lg">Plant, grow, and harvest your own farm!</p>
        </div>
      </motion.div>

      <div className="flex items-center gap-4 bg-black/25 border border-white/10 rounded-full px-6 py-2 mb-8 text-sm">
        <span className="font-bold">💰 {coins} coins</span>
        <span className="text-white/50">🌾 {totalHarvests} harvested</span>
        <span className="text-white/50">🔓 {unlockedPlotCount}/{MAX_PLOT_COUNT} plots</span>
      </div>

      <div className="grid grid-cols-3 gap-5 max-w-2xl">
        {ITEMS.map((item, i) => (
          <motion.div
            key={item.action}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
          >
            <HoverButton
              onActivate={() => onSelect(item.action)}
              ringColor={item.color}
              className="flex flex-col items-center justify-center gap-2 w-40 h-32 rounded-2xl bg-white/5 border border-white/10"
            >
              <span className="text-3xl">{item.emoji}</span>
              <span className="text-lg font-bold text-white/90">{item.label}</span>
            </HoverButton>
          </motion.div>
        ))}
      </div>

      <p className="mt-10 text-xs text-white/30">Hover over a tile with your fingertip to select it</p>
    </div>
  );
}
