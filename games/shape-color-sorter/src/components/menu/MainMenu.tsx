import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import ShapeIcon from '../common/ShapeIcon';
import { useProgressStore } from '../../stores/progressStore';
import type { SortMode } from '../../types';

export type MainMenuAction = SortMode | 'settings' | 'exit';

const ITEMS: { action: MainMenuAction; label: string; color: string }[] = [
  { action: 'shape', label: 'Sort by Shape', color: '#2A5CD6' },
  { action: 'color', label: 'Sort by Color', color: '#2FA35A' },
  { action: 'mixed', label: 'Mixed Mode', color: '#F07A26' },
  { action: 'settings', label: 'Settings', color: '#9B4FD6' },
  { action: 'exit', label: 'Exit', color: '#E4362E' },
];

export default function MainMenu({ onSelect }: { onSelect: (a: MainMenuAction) => void }) {
  const bestStarsByMode = useProgressStore((s) => s.bestStarsByMode);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#2a1a5e] via-[#3a1a6e] to-[#1a0e3d] flex flex-col items-center justify-center text-white px-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4 flex items-center gap-4">
        <ShapeIcon shape="star" color="#F4C430" className="w-16 h-16 scs-bob" />
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-white to-sky-300">
            Shape &amp; Color Sorter
          </h1>
          <p className="text-white/50 mt-1 text-lg">Sort with your hand!</p>
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
              <span className="text-lg font-bold text-white/90">{item.label}</span>
              {(item.action === 'shape' || item.action === 'color' || item.action === 'mixed') && (
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
