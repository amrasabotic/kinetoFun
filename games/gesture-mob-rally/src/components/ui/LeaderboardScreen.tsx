import { useLeaderboardStore } from '../../stores/useLeaderboardStore';
import HoverButton from '../common/HoverButton';

export default function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const entries = useLeaderboardStore((s) => s.entries);

  return (
    <div className="absolute inset-0 bg-[#12101a] text-white flex flex-col items-center px-8 py-6">
      <div className="flex items-center justify-between w-full max-w-xl mb-6">
        <h1 className="text-2xl font-extrabold">🏆 Leaderboard</h1>
        <HoverButton onSelect={onBack} className="rounded-full overflow-hidden">
          <div className="px-4 py-1.5 bg-white/10 text-sm font-bold">Back</div>
        </HoverButton>
      </div>

      <div className="w-full max-w-xl flex flex-col gap-2">
        {entries.length === 0 && <p className="text-white/50 text-center mt-10">No runs yet — play a game to set a score!</p>}
        {entries.map((e, i) => (
          <div key={e.date} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/5">
            <span className="w-6 text-center font-extrabold text-white/40">{i + 1}</span>
            <span className="flex-1 font-bold text-lg">{e.score}</span>
            <span className="text-xs text-white/50">Lv {e.levelsCompleted}</span>
            <span className="text-xs text-white/50">👥 {e.highestCrowd}</span>
            <span className="text-xs text-white/50">👑 {e.bossesDefeated}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
