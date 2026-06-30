import { motion } from 'framer-motion';
import type { Statistics } from '../../types';
import { playClick } from '../../game/audio/audioSystem';

interface Props {
  stats: Statistics;
  onBack: () => void;
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export default function StatisticsScreen({ stats, onBack }: Props) {
  const items = [
    { label: 'High Score',        value: stats.highScore.toLocaleString(),         emoji: '🏆' },
    { label: 'Longest Snake',     value: String(stats.longestSnake),               emoji: '🐍' },
    { label: 'Games Played',      value: String(stats.gamesPlayed),                emoji: '🎮' },
    { label: 'Total Playtime',    value: fmt(stats.totalSurvivalTime),             emoji: '⏱️' },
    { label: 'Energy Collected',  value: stats.totalEnergyCollected.toLocaleString(), emoji: '⚡' },
    { label: 'AI Snakes Defeated',value: String(stats.aiSnakesDefeated),           emoji: '💀' },
    { label: 'Power-ups Collected',value: String(stats.powerUpsCollected),         emoji: '🎯' },
    { label: 'Boosts Used',       value: String(stats.boostsUsed),                 emoji: '🚀' },
    { label: 'Combo Record',      value: `×${stats.comboRecord}`,                  emoji: '🔥' },
    { label: 'Coins Earned',      value: stats.coinsEarned.toLocaleString() + ' 🪙', emoji: '💰' },
  ];

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0a1e, #0d0d35)' }}>
      <div className="flex items-center gap-4 px-6 pt-6 pb-4">
        <button className="text-white/60 font-display text-lg hover:text-white transition-colors"
          onClick={() => { playClick(); onBack(); }}>← Back</button>
        <h2 className="text-2xl font-black font-display text-white">Statistics</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-1 gap-3">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <span className="text-2xl w-8">{item.emoji}</span>
              <div className="flex-1">
                <div className="text-xs text-white/50 font-sans uppercase tracking-wider">{item.label}</div>
                <div className="text-xl font-bold font-display text-white">{item.value}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
