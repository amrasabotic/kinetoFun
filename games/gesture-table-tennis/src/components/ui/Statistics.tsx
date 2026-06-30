import { motion } from 'framer-motion';
import type { Statistics, GameMode } from '../../types';

interface Props { stats: Statistics; coins: number; onBack: () => void; }

const MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic', arcade: 'Arcade', survival: 'Survival',
  precision: 'Precision', smash: 'Smash', tournament: 'Tournament',
};

export default function StatisticsScreen({ stats, coins, onBack }: Props) {
  const rows: { label: string; value: string | number; icon: string }[] = [
    { icon: '🏓', label: 'Matches Played',   value: stats.matchesPlayed },
    { icon: '🏆', label: 'Matches Won',       value: stats.matchesWon },
    { icon: '📈', label: 'Win Rate',           value: stats.matchesPlayed > 0 ? `${Math.round((stats.matchesWon / stats.matchesPlayed) * 100)}%` : '—' },
    { icon: '🔄', label: 'Longest Rally',     value: stats.longestRally },
    { icon: '🔥', label: 'Best Combo',        value: `×${stats.highestCombo}` },
    { icon: '✨', label: 'Perfect Hits',       value: stats.perfectHits },
    { icon: '💥', label: 'Smashes',            value: stats.smashCount },
    { icon: '⚡', label: 'Power Shots Used',  value: stats.powerShotsUsed },
    { icon: '↩️', label: 'Total Returns',     value: stats.totalReturns },
    { icon: '🏆', label: 'Tournament Wins',   value: stats.tournamentWins },
    { icon: '⏱️', label: 'Hours Played',      value: `${stats.hoursPlayed.toFixed(1)}h` },
    { icon: '🪙', label: 'Total Coins Earned', value: stats.coinsEarned },
  ];

  const highScores = Object.entries(stats.highScores ?? {}) as [GameMode, number][];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
         style={{ background: 'radial-gradient(ellipse at 50% 20%, #1a003a 0%, #0a0014 70%)' }}>

      <div className="flex items-center gap-4 p-6 pb-2">
        <button onClick={onBack} className="text-purple-300 hover:text-white transition-colors text-2xl">←</button>
        <h2 className="text-3xl font-black text-white">Statistics</h2>
        <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <span className="text-xl">🪙</span>
          <span className="text-yellow-300 font-black text-xl">{coins}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {rows.map((r, i) => (
            <motion.div key={r.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="p-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{r.icon}</span>
                <span className="text-gray-400 text-xs font-medium">{r.label}</span>
              </div>
              <div className="text-white font-black text-2xl">{r.value}</div>
            </motion.div>
          ))}
        </div>

        {/* High scores */}
        {highScores.length > 0 && (
          <div>
            <h3 className="text-purple-300 font-bold text-sm uppercase tracking-widest mb-3">High Scores by Mode</h3>
            <div className="flex flex-col gap-2">
              {highScores.map(([mode, score]) => (
                <div key={mode} className="flex items-center justify-between px-4 py-3 rounded-xl"
                     style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span className="text-gray-300 font-medium">{MODE_LABELS[mode]}</span>
                  <span className="text-yellow-300 font-black">{score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {highScores.length === 0 && (
          <div className="text-center text-gray-500 py-8">Play some matches to see high scores here!</div>
        )}
      </div>
    </div>
  );
}
