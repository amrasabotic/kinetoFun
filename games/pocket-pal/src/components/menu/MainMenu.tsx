import { motion } from 'framer-motion';
import HoverButton from '../common/HoverButton';
import { usePetStore } from '../../stores/petStore';

export type MainMenuAction = 'enter-pet' | 'settings' | 'exit';

const ITEMS: { action: MainMenuAction; label: string; emoji: string; color: string }[] = [
  { action: 'enter-pet', label: 'Visit Pal', emoji: '😊', color: '#FF1493' },
  { action: 'settings', label: 'Settings', emoji: '⚙️', color: '#4A90D9' },
  { action: 'exit', label: 'Exit', emoji: '👋', color: '#9B4FD6' },
];

export default function MainMenu({ onSelect }: { onSelect: (a: MainMenuAction) => void }) {
  const hearts = usePetStore((s) => s.hearts);
  const totalCareActions = usePetStore((s) => s.totalCareActions);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 flex flex-col items-center justify-center text-white px-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
        <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-200 via-white to-purple-200 mb-2">
          Pocket Pal
        </h1>
        <p className="text-white/50 text-lg">Your digital companion awaits</p>
      </motion.div>

      <div className="flex items-center gap-4 bg-black/25 border border-white/10 rounded-full px-6 py-2 mb-8 text-sm">
        <span className="font-bold">❤️ {hearts} Hearts</span>
        <span className="text-white/50">🎯 {totalCareActions} actions</span>
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
