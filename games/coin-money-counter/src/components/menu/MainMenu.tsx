import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import CoinGroup from '../common/CoinGroup';
import { useProgressStore } from '../../stores/progressStore';
import type { MoneyGameMode } from '../../types';

export type MainMenuAction = MoneyGameMode | 'settings' | 'exit';

const ITEMS: { action: MainMenuAction; label: string; emoji: string; color: string }[] = [
  { action: 'count', label: 'Count the Coins', emoji: '🪙', color: '#FFD700' },
  { action: 'make', label: 'Make the Amount', emoji: '🏦', color: '#2FA35A' },
  { action: 'mixed', label: 'Mixed Mode', emoji: '🎲', color: '#F07A26' },
  { action: 'settings', label: 'Settings', emoji: '⚙️', color: '#9B4FD6' },
  { action: 'exit', label: 'Exit', emoji: '👋', color: '#E4362E' },
];

export default function MainMenu({ onSelect }: { onSelect: (a: MainMenuAction) => void }) {
  const bestStarsByMode = useProgressStore((s) => s.bestStarsByMode);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2a1a5e] via-[#3a1a6e] to-[#1a0e3d] flex flex-col items-center justify-center text-white px-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4 flex items-center gap-4">
        <div className="scs-bob">
          <CoinGroup amount={42} size="normal" />
        </div>
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-white to-amber-200">
            Coin & Money Counter
          </h1>
          <p className="text-white/50 mt-1 text-lg">Learn to count money!</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-5 max-w-3xl mt-8">
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
              {(item.action === 'count' || item.action === 'make' || item.action === 'mixed') && (
                <span className="text-yellow-300 text-sm">{'⭐'.repeat(bestStarsByMode[item.action]) || '☆'}</span>
              )}
            </HoverButton>
          </motion.div>
        ))}
      </div>

      <p className="mt-10 text-xs text-white/30">Hover over a tile with your fingertip to select it</p>
    </div>
  );
}
