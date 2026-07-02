import { useGameStore } from '../../stores/useGameStore';
import HoverButton from '../common/HoverButton';

export default function GameOverScreen({
  score, highScore, onPlayAgain, onMenu,
}: {
  score: number;
  highScore: number;
  onPlayAgain: () => void;
  onMenu: () => void;
}) {
  const lastResult = useGameStore((s) => s.lastResult);
  const isNewHigh = score >= highScore && score > 0;

  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white px-6">
      <h1 className="text-4xl font-extrabold mb-1">Rally Over!</h1>
      {isNewHigh && <p className="text-amber-300 font-bold mb-3">🏆 New High Score!</p>}

      <div className="text-6xl font-extrabold mb-6 text-orange-400">{score}</div>

      {lastResult && (
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 mb-8 text-sm">
          <Stat label="Levels Completed" value={lastResult.levelsCompleted} />
          <Stat label="Highest Crowd" value={lastResult.highestCrowd} />
          <Stat label="Bosses Defeated" value={lastResult.bossesDefeated} />
          <Stat label="Enemies Defeated" value={lastResult.enemiesDefeated} />
          <Stat label="Distance" value={`${lastResult.distance}m`} />
          <Stat label="Best Combo" value={lastResult.bestCombo} />
          <Stat label="Coins Earned" value={lastResult.coinsEarned} />
        </div>
      )}

      <div className="flex gap-3">
        <HoverButton onSelect={onPlayAgain} className="rounded-full overflow-hidden">
          <div className="px-6 py-2.5 bg-orange-500 font-bold">Play Again</div>
        </HoverButton>
        <HoverButton onSelect={onMenu} className="rounded-full overflow-hidden">
          <div className="px-6 py-2.5 bg-white/10 font-bold">Main Menu</div>
        </HoverButton>
      </div>
      <p className="mt-6 text-xs text-white/30">Hover a button with your fingertip to select</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-4 min-w-[220px]">
      <span className="text-white/50">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
