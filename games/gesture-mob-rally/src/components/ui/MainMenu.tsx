import type { Screen } from '../../types';
import HoverButton from '../common/HoverButton';

export default function MainMenu({
  coins, highScore, onNavigate, onFullscreen,
}: {
  coins: number;
  highScore: number;
  onNavigate: (screen: Screen) => void;
  onFullscreen: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#2a1a0f] via-[#1a0f20] to-[#0b0e1a] flex flex-col items-center justify-center text-white px-6">
      <h1 className="text-6xl font-extrabold mb-1 bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300 bg-clip-text text-transparent">
        Mob Rally
      </h1>
      <p className="text-white/50 mb-10 text-sm tracking-wide uppercase">Grow your crowd. Rally to victory.</p>

      <div className="flex gap-6 mb-8 text-sm">
        <div className="flex items-center gap-1.5"><span>🪙</span><span className="font-bold">{coins}</span></div>
        <div className="flex items-center gap-1.5"><span>🏆</span><span className="font-bold">{highScore}</span></div>
      </div>

      <div className="flex flex-col gap-3 w-64">
        <MenuButton primary onSelect={() => onNavigate('playing')}>▶ Play</MenuButton>
        <MenuButton onSelect={() => onNavigate('shop')}>🎩 Shop</MenuButton>
        <MenuButton onSelect={() => onNavigate('leaderboard')}>🏆 Leaderboard</MenuButton>
        <MenuButton onSelect={() => onNavigate('settings')}>⚙ Settings</MenuButton>
        <MenuButton onSelect={() => onNavigate('howtoplay')}>❔ How to Play</MenuButton>
        <MenuButton onSelect={onFullscreen}>⛶ Fullscreen</MenuButton>
        <MenuButton onSelect={() => onNavigate('credits')}>ℹ Credits</MenuButton>
      </div>

      <p className="mt-8 text-xs text-white/30">Hover a button with your fingertip for a moment to select it</p>
    </div>
  );
}

function MenuButton({ children, onSelect, primary }: { children: React.ReactNode; onSelect: () => void; primary?: boolean }) {
  return (
    <HoverButton onSelect={onSelect} className="rounded-2xl overflow-hidden">
      <div className={`px-6 py-3 font-bold ${primary ? 'bg-orange-500 text-white text-lg' : 'bg-white/10 text-white'}`}>
        {children}
      </div>
    </HoverButton>
  );
}
