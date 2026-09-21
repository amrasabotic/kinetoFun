import { AnimatedBackground } from './AnimatedBackground';
import { DwellButton } from './DwellButton';
import { Cursor } from './Cursor';
import type { GestureState } from '../types';
import type { Statistics } from '../systems/save';
import { formatTime } from '../utils/helpers';

interface StatisticsScreenProps {
  stats: Statistics;
  onBack: () => void;
  gesture: GestureState;
}

function favoriteMode(counts: Statistics['modePlayCounts']): string {
  const entries = Object.entries(counts) as [string, number][];
  const [name] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best), entries[0]);
  return name;
}

export function StatisticsScreen({ stats, onBack, gesture }: StatisticsScreenProps) {
  const completionPct = stats.gamesPlayed === 0 ? 0 : Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
  const avgMoves = stats.gamesWon === 0 ? 0 : Math.round(stats.totalMoves / stats.gamesWon);

  const rows: [string, string][] = [
    ['Games Played', String(stats.gamesPlayed)],
    ['Games Won', String(stats.gamesWon)],
    ['Completion Rate', `${completionPct}%`],
    ['Total Moves', String(stats.totalMoves)],
    ['Average Moves', String(avgMoves)],
    ['Fastest Solve', stats.fastestSolveMs !== null ? formatTime(Math.round(stats.fastestSolveMs / 1000)) : '—'],
    ['Longest Streak', String(stats.longestStreak)],
    ['Current Streak', String(stats.currentStreak)],
    ['Hints Used', String(stats.hintsUsed)],
    ['Undo Used', String(stats.undosUsed)],
    ['Favorite Mode', favoriteMode(stats.modePlayCounts)],
  ];

  return (
    <div className="lp-screen">
      <AnimatedBackground />
      <div className="lp-panel">
        <h2 className="lp-screen__title">Statistics</h2>
        <div className="lp-stats-grid">
          {rows.map(([label, value]) => (
            <div key={label} className="lp-stats-grid__row">
              <span className="lp-stats-grid__label">{label}</span>
              <span className="lp-stats-grid__value">{value}</span>
            </div>
          ))}
        </div>
        <DwellButton label="Back" onActivate={onBack} className="lp-menu-btn lp-menu-btn--warn" />
      </div>
      <Cursor gesture={gesture} />
    </div>
  );
}
