/** Statistics screen showing all-time records. */
import { motion } from 'framer-motion';
import type { Statistics as StatsType } from '../../types';
import { playUiClick } from '../../game/audio/audioSystem';

interface Props { stats: StatsType; onBack: () => void; }

export default function Statistics({ stats, onBack }: Props) {
  const formatTime = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const rows = [
    { icon: '📏', label: 'Best Distance',    value: `${Math.floor(stats.bestDistance)}m` },
    { icon: '⭐', label: 'Highest Score',    value: stats.highestScore.toLocaleString() },
    { icon: '🪙', label: 'Coins Collected',  value: stats.coinsCollected.toLocaleString() },
    { icon: '⏱️', label: 'Total Play Time',  value: formatTime(stats.totalPlayTime) },
    { icon: '🎮', label: 'Games Played',     value: stats.gamesPlayed.toLocaleString() },
    { icon: '🔄', label: 'Flips Performed',  value: stats.flipsPerformed.toLocaleString() },
    { icon: '⚡', label: 'Fuel Pickups',     value: stats.fuelPickups.toLocaleString() },
  ];

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#0b0e1a,#1a1040)' }}
    >
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { playUiClick(); onBack(); }}
          className="glass rounded-xl px-4 py-2 text-white font-bold text-sm"
        >
          ← Back
        </motion.button>
        <h2 className="text-2xl font-black text-white">Statistics</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
        {rows.map((r, i) => (
          <motion.div
            key={r.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-center gap-4 rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <span className="text-2xl">{r.icon}</span>
            <div className="flex-1">
              <div className="text-white/55 text-xs">{r.label}</div>
              <div className="text-white font-bold text-lg">{r.value}</div>
            </div>
          </motion.div>
        ))}

        {stats.gamesPlayed === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🎮</div>
            <p className="text-white/50 text-sm">No games played yet.<br/>Hit Play to start your adventure!</p>
          </div>
        )}
      </div>
    </div>
  );
}
