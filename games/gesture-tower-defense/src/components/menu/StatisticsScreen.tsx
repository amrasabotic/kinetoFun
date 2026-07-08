import HoverButton from '../common/HoverButton';
import { useGameStore } from '../../stores/gameStore';

export default function StatisticsScreen({ onBack }: { onBack: () => void }) {
  const stats = useGameStore((s) => s.stats);
  const endlessHighestWave = useGameStore((s) => s.endlessHighestWave);
  const campaignHighestUnlocked = useGameStore((s) => s.campaignHighestUnlocked);

  const rows: [string, string][] = [
    ['Matches Played', String(stats.matchesPlayed)],
    ['Matches Won', String(stats.matchesWon)],
    ['Enemies Defeated', String(stats.enemiesDefeated)],
    ['Waves Cleared', String(stats.wavesCleared)],
    ['Towers Placed', String(stats.towersPlaced)],
    ['Endless — Highest Wave', String(endlessHighestWave)],
    ['Campaign — Levels Unlocked', String(campaignHighestUnlocked)],
  ];

  return (
    <div className="td-screen td-menu">
      <h2 className="td-screen__title">Statistics</h2>
      <div className="td-stats-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="td-stats-grid__row">
            <span className="td-stats-grid__label">{label}</span>
            <span className="td-stats-grid__value">{value}</span>
          </div>
        ))}
      </div>
      <HoverButton onActivate={onBack} ringColor="#F87171" className="td-menu-btn td-menu-btn--warn">
        Back
      </HoverButton>
    </div>
  );
}
