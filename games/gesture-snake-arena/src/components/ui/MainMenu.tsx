import { motion } from 'framer-motion';
import type { SaveData } from '../../types';
import { playClick, initAudio } from '../../game/audio/audioSystem';

interface Props {
  save: SaveData;
  onPlay:     () => void;
  onSkins:    () => void;
  onStats:    () => void;
  onSettings: () => void;
  onHowToPlay:() => void;
  onCredits:  () => void;
}

const SNAKE_COLORS = ['#5EED7A','#FF5733','#00F5FF','#FFD700','#BB86FC'];

export default function MainMenu({ save, onPlay, onSkins, onStats, onSettings, onHowToPlay, onCredits }: Props) {
  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a0a1e 0%, #0d0d35 50%, #0a1a0a 100%)' }}>

      {/* Animated background orbs */}
      {SNAKE_COLORS.map((c, i) => (
        <motion.div key={i}
          className="absolute rounded-full opacity-20 blur-3xl"
          style={{ width: 300, height: 300, background: c,
            left: `${10 + i * 18}%`, top: `${20 + (i % 2) * 40}%` }}
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
        />
      ))}

      {/* Animated snake decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <SnakeDecoration />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8" style={{ maxWidth: 460, width: '90%' }}>
        {/* Logo */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center"
        >
          <div className="text-6xl mb-2">🐍</div>
          <h1 className="font-display font-black text-5xl leading-none"
            style={{ background: 'linear-gradient(135deg, #5EED7A, #00F5FF, #BB86FC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Gesture Snake
          </h1>
          <div className="text-xl font-display font-bold text-white/60 mt-1">Arena</div>
          <div className="text-xs font-sans text-white/30 mt-2 tracking-widest uppercase">KinetoFun</div>
        </motion.div>

        {/* Stats summary */}
        <motion.div
          className="flex gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <MiniStat label="Best" value={save.statistics.highScore.toLocaleString()} />
          <MiniStat label="Games" value={String(save.statistics.gamesPlayed)} />
          <MiniStat label="Coins" value={String(save.coins)} emoji="🪙" />
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="flex flex-col gap-3 w-full"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, stiffness: 200, type: 'spring' }}
        >
          <MenuBtn
            primary
            onClick={() => { initAudio(); playClick(); onPlay(); }}
            label="▶  Play"
          />
          <div className="grid grid-cols-2 gap-3">
            <MenuBtn onClick={() => { playClick(); onSkins(); }}     label="🎨 Skins" />
            <MenuBtn onClick={() => { playClick(); onStats(); }}     label="📊 Stats" />
            <MenuBtn onClick={() => { playClick(); onSettings(); }}  label="⚙️ Settings" />
            <MenuBtn onClick={() => { playClick(); onHowToPlay(); }} label="❓ How to Play" />
          </div>
          <MenuBtn onClick={() => { playClick(); onCredits(); }} label="🎬 Credits" subtle />
        </motion.div>
      </div>
    </div>
  );
}

function MenuBtn({ onClick, label, primary, subtle }: { onClick:()=>void; label:string; primary?:boolean; subtle?:boolean }) {
  return (
    <button
      className="w-full py-4 rounded-2xl font-display font-bold text-lg text-white transition-all duration-150 active:scale-95 hover:scale-[1.02]"
      style={primary
        ? { background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', boxShadow: '0 4px 30px rgba(124,58,237,0.5)' }
        : subtle
          ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
          : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MiniStat({ label, value, emoji }: { label: string; value: string; emoji?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-white font-bold font-display text-lg">{emoji ?? ''}{value}</div>
      <div className="text-white/40 text-xs font-sans uppercase tracking-wider">{label}</div>
    </div>
  );
}

function SnakeDecoration() {
  const pts: [number, number][] = [
    [5,15],[10,20],[15,18],[20,22],[25,17],[30,21],[35,16],[40,20],
    [45,15],[50,19],[55,14],[60,18],[65,13],[70,17],[75,12],[80,16],
    [85,11],[90,15],[95,10],[100,14],
  ];
  const path = pts.map(([x,y], i) => `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`).join(' ');
  return (
    <svg className="absolute w-full" style={{ top: 0, opacity: 0.06 }} viewBox="0 0 100 30" preserveAspectRatio="none">
      <path d={path} stroke="#5EED7A" strokeWidth="2" fill="none" />
    </svg>
  );
}
