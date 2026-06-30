import { motion } from 'framer-motion';
import type { GameMode, AIDifficulty, ArenaId } from '../../types';
import { ARENAS } from '../../constants/gameConfig';

interface Props {
  pendingMode: GameMode;
  pendingDifficulty: AIDifficulty;
  pendingArena: ArenaId;
  onSelectMode: (m: GameMode) => void;
  onSelectDifficulty: (d: AIDifficulty) => void;
  onSelectArena: (a: ArenaId) => void;
  onPlay: () => void;
  onBack: () => void;
}

const MODES: { id: GameMode; name: string; icon: string; desc: string }[] = [
  { id: 'classic',    name: 'Classic Match',     icon: '🏓', desc: 'First to 11 — best rally wins' },
  { id: 'arcade',     name: 'Arcade Challenge',  icon: '⚡', desc: 'Progressive stages with modifiers' },
  { id: 'survival',   name: 'Survival Mode',     icon: '💪', desc: 'Return endlessly — score a long rally' },
  { id: 'precision',  name: 'Precision Shot',    icon: '🎯', desc: 'Hit targets to score big' },
  { id: 'smash',      name: 'Smash Challenge',   icon: '🔥', desc: '60-second power shot frenzy' },
  { id: 'tournament', name: 'Tournament',        icon: '🏆', desc: 'Defeat 6 unique opponents' },
];

const DIFFICULTIES: { id: AIDifficulty; label: string; color: string }[] = [
  { id: 'easy',   label: 'Easy',   color: '#4ade80' },
  { id: 'medium', label: 'Medium', color: '#fbbf24' },
  { id: 'hard',   label: 'Hard',   color: '#f97316' },
  { id: 'expert', label: 'Expert', color: '#f43f5e' },
];

export default function GameModes({ pendingMode, pendingDifficulty, pendingArena, onSelectMode, onSelectDifficulty, onSelectArena, onPlay, onBack }: Props) {
  const isTimedMode = pendingMode === 'smash' || pendingMode === 'survival' || pendingMode === 'precision' || pendingMode === 'arcade' || pendingMode === 'tournament';

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto"
         style={{ background: 'radial-gradient(ellipse at 30% 60%, #1a003a 0%, #0a0014 70%)' }}>

      {/* Header */}
      <div className="flex items-center gap-4 p-6 pb-2">
        <button onClick={onBack} className="text-purple-300 hover:text-white transition-colors text-2xl">←</button>
        <h2 className="text-3xl font-black text-white">Game Modes</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6 flex-1">

        {/* Mode selection */}
        <div className="flex-1">
          <p className="text-purple-300 text-sm font-semibold uppercase tracking-widest mb-3">Select Mode</p>
          <div className="grid grid-cols-2 gap-3">
            {MODES.map(m => {
              const active = pendingMode === m.id;
              return (
                <motion.button key={m.id}
                  onClick={() => onSelectMode(m.id)}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="p-4 rounded-2xl text-left transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'rgba(255,255,255,0.06)',
                    border: `2px solid ${active ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: active ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
                  }}>
                  <div className="text-3xl mb-1">{m.icon}</div>
                  <div className="text-white font-bold text-sm">{m.name}</div>
                  <div className="text-gray-400 text-xs mt-1">{m.desc}</div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right panel: difficulty + arena */}
        <div className="w-full lg:w-64 flex flex-col gap-6">

          {/* Difficulty (not for survival/precision/smash/tournament) */}
          {!isTimedMode && (
            <div>
              <p className="text-purple-300 text-sm font-semibold uppercase tracking-widest mb-3">AI Difficulty</p>
              <div className="flex flex-col gap-2">
                {DIFFICULTIES.map(d => {
                  const active = pendingDifficulty === d.id;
                  return (
                    <button key={d.id}
                      onClick={() => onSelectDifficulty(d.id)}
                      className="py-3 px-4 rounded-xl font-bold text-left transition-all"
                      style={{
                        background: active ? `${d.color}22` : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${active ? d.color : 'rgba(255,255,255,0.08)'}`,
                        color: active ? d.color : '#9ca3af',
                      }}>
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Arena */}
          <div>
            <p className="text-purple-300 text-sm font-semibold uppercase tracking-widest mb-3">Arena</p>
            <div className="grid grid-cols-2 gap-2">
              {ARENAS.map(a => {
                const active = pendingArena === a.id;
                return (
                  <button key={a.id}
                    onClick={() => onSelectArena(a.id)}
                    className="py-2 px-3 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: active ? `${a.accentColor}22` : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${active ? a.accentColor : 'rgba(255,255,255,0.08)'}`,
                      color: active ? a.accentColor : '#9ca3af',
                    }}>
                    <div>{a.emoji}</div>
                    <div className="mt-0.5 truncate">{a.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Play button */}
          <motion.button
            onClick={onPlay}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="w-full py-4 rounded-2xl font-black text-xl text-white shadow-lg mt-auto"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 30px rgba(124,58,237,0.5)' }}>
            ▶ START
          </motion.button>
        </div>
      </div>
    </div>
  );
}
