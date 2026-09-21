import React, { useState } from 'react';
import { Level } from '../types/game';
import {
  MapPin, Star, Shield, Zap, Clock, Target, ChevronRight,
  CheckCircle, ArrowLeft
} from 'lucide-react';

interface LevelMapProps {
  levels: Level[];
  unlockedUpTo: number;
  completedScores: number[];
  onSelectLevel: (levelIndex: number) => void;
  onBack: () => void;
}

// Hand-placed positions on a 1000×600 virtual canvas
const NODE_POSITIONS = [
  { x: 120, y: 460 },
  { x: 340, y: 280 },
  { x: 580, y: 380 },
  { x: 820, y: 160 },
];

// Path control points between nodes (cubic bezier via SVG)
const PATHS = [
  { d: 'M 120 460 C 200 460 260 280 340 280' },
  { d: 'M 340 280 C 420 280 500 380 580 380' },
  { d: 'M 580 380 C 660 380 740 160 820 160' },
];

const REGION_COLORS = [
  { bg: 'from-emerald-900/60 to-green-900/60', accent: '#4ecca7', glow: 'rgba(78,204,167,0.35)' },
  { bg: 'from-blue-900/60 to-cyan-900/60',    accent: '#38bdf8', glow: 'rgba(56,189,248,0.35)' },
  { bg: 'from-purple-900/60 to-violet-900/60', accent: '#a78bfa', glow: 'rgba(167,139,250,0.35)' },
  { bg: 'from-amber-900/60 to-orange-900/60', accent: '#fbbf24', glow: 'rgba(251,191,36,0.35)' },
];

export const LevelMap: React.FC<LevelMapProps> = ({
  levels,
  unlockedUpTo,
  completedScores,
  onSelectLevel,
  onBack,
}) => {
  const [selected, setSelected] = useState<number | null>(null);

  const selectedLevel = selected !== null ? levels[selected] : null;
  const selectedColor = selected !== null ? REGION_COLORS[selected] : null;

  const nodeStatus = (i: number) => {
    if (i < unlockedUpTo) return 'completed';
    if (i === unlockedUpTo) return 'unlocked';
    return 'locked';
  };

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: '#0d1117' }}>
      {/* Parchment / map texture layer */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 80%, rgba(78,204,167,0.25) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 20%, rgba(251,191,36,0.2) 0%, transparent 55%),
            radial-gradient(ellipse at 50% 50%, rgba(167,139,250,0.1) 0%, transparent 70%)
          `
        }}
      />

      {/* Grid lines (map grid effect) */}
      <svg className="absolute inset-0 w-full h-full opacity-5" preserveAspectRatio="none">
        <defs>
          <pattern id="mapgrid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapgrid)" />
      </svg>

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-8 pt-6 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-all duration-200 backdrop-blur-sm border border-slate-700/50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Main Menu</span>
        </button>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-wide">Adventure Map</h1>
          <p className="text-xs text-slate-400 mt-0.5">Choose your next challenge</p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-700/50">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-slate-300">
            {unlockedUpTo}/{levels.length} complete
          </span>
        </div>
      </div>

      {/* Map canvas */}
      <div className="relative z-10 w-full" style={{ height: 'calc(100% - 72px)' }}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connecting paths */}
          {PATHS.map((path, i) => {
            const fromStatus = nodeStatus(i);
            const toStatus = nodeStatus(i + 1);
            const active = fromStatus !== 'locked';
            return (
              <g key={i}>
                {/* Shadow */}
                <path
                  d={path.d}
                  fill="none"
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Base track */}
                <path
                  d={path.d}
                  fill="none"
                  stroke={active ? '#334155' : '#1e293b'}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Completed portion overlay */}
                {fromStatus === 'completed' && toStatus !== 'locked' && (
                  <path
                    d={path.d}
                    fill="none"
                    stroke={REGION_COLORS[i].accent}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="12 6"
                    opacity="0.7"
                  />
                )}
                {fromStatus !== 'locked' && toStatus === 'locked' && (
                  <path
                    d={path.d}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="6 10"
                    opacity="0.5"
                  />
                )}
              </g>
            );
          })}

          {/* Level nodes */}
          {levels.map((level, i) => {
            const pos = NODE_POSITIONS[i];
            const status = nodeStatus(i);
            const color = REGION_COLORS[i];
            const isSelected = selected === i;
            const score = completedScores[i] ?? 0;

            return (
              <g
                key={level.id}
                className="cursor-pointer"
                onClick={() => status !== 'locked' && setSelected(isSelected ? null : i)}
                style={{ cursor: status === 'locked' ? 'not-allowed' : 'pointer' }}
              >
                {/* Glow ring when selected */}
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="52"
                    fill="none"
                    stroke={color.accent}
                    strokeWidth="2"
                    opacity="0.6"
                  >
                    <animate attributeName="r" values="50;58;50" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Ambient glow */}
                {status !== 'locked' && (
                  <circle cx={pos.x} cy={pos.y} r="44" fill={color.glow} />
                )}

                {/* Node border */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="36"
                  fill={status === 'locked' ? '#1e293b' : '#0f172a'}
                  stroke={status === 'locked' ? '#334155' : isSelected ? color.accent : color.accent + '99'}
                  strokeWidth={isSelected ? 3 : 2}
                />

                {/* Inner fill */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="28"
                  fill={
                    status === 'locked'
                      ? '#1e293b'
                      : status === 'completed'
                      ? color.accent + '33'
                      : color.accent + '22'
                  }
                />

                {/* Icon */}
                {status === 'locked' ? (
                  <text x={pos.x} y={pos.y + 6} textAnchor="middle" fontSize="20" fill="#475569">
                    🔒
                  </text>
                ) : status === 'completed' ? (
                  <text x={pos.x} y={pos.y + 7} textAnchor="middle" fontSize="22">
                    ✓
                  </text>
                ) : (
                  <text x={pos.x} y={pos.y + 7} textAnchor="middle" fontSize="22">
                    ⚔️
                  </text>
                )}

                {/* Level number badge */}
                <circle cx={pos.x + 28} cy={pos.y - 24} r="12" fill="#0f172a" stroke={color.accent} strokeWidth="1.5" />
                <text
                  x={pos.x + 28}
                  y={pos.y - 19}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill={color.accent}
                >
                  {level.id}
                </text>

                {/* Level name label */}
                <text
                  x={pos.x}
                  y={pos.y + 52}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill={status === 'locked' ? '#475569' : '#e2e8f0'}
                >
                  {level.name}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 66}
                  textAnchor="middle"
                  fontSize="10"
                  fill={status === 'locked' ? '#334155' : '#94a3b8'}
                >
                  {level.region}
                </text>

                {/* Best score for completed levels */}
                {status === 'completed' && score > 0 && (
                  <text
                    x={pos.x}
                    y={pos.y + 80}
                    textAnchor="middle"
                    fontSize="10"
                    fill={color.accent}
                    fontWeight="500"
                  >
                    Best: {score}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Detail panel */}
        {selectedLevel && selectedColor && selected !== null && (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4"
            style={{ zIndex: 30 }}
          >
            <div
              className={`rounded-2xl border backdrop-blur-md shadow-2xl overflow-hidden bg-gradient-to-br ${selectedColor.bg}`}
              style={{ borderColor: selectedColor.accent + '44' }}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full" style={{ background: `linear-gradient(to right, transparent, ${selectedColor.accent}, transparent)` }} />

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-3.5 h-3.5" style={{ color: selectedColor.accent }} />
                      <span className="text-xs font-medium" style={{ color: selectedColor.accent }}>
                        {selectedLevel.region}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      Level {selectedLevel.id} — {selectedLevel.name}
                    </h2>
                    <p className="text-sm text-slate-400 mt-0.5">{selectedLevel.objective}</p>
                  </div>

                  {nodeStatus(selected) === 'completed' && (
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: selectedColor.accent + '22', color: selectedColor.accent, border: `1px solid ${selectedColor.accent}55` }}>
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </div>
                  )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    {
                      icon: <Target className="w-4 h-4" />,
                      label: 'Score Target',
                      value: selectedLevel.scoreTarget.toLocaleString(),
                      highlight: true,
                    },
                    {
                      icon: <Clock className="w-4 h-4" />,
                      label: 'Duration',
                      value: `${selectedLevel.duration / 1000}s`,
                      highlight: false,
                    },
                    {
                      icon: <Zap className="w-4 h-4" />,
                      label: 'Speed',
                      value: `×${selectedLevel.speedMultiplier}`,
                      highlight: false,
                    },
                    {
                      icon: <Star className="w-4 h-4" />,
                      label: 'Star Rate',
                      value: `${Math.round(selectedLevel.starChance * 100)}%`,
                      highlight: false,
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3 text-center"
                      style={{
                        background: stat.highlight
                          ? selectedColor.accent + '18'
                          : 'rgba(15,23,42,0.5)',
                        border: `1px solid ${stat.highlight ? selectedColor.accent + '44' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div className="flex justify-center mb-1" style={{ color: stat.highlight ? selectedColor.accent : '#94a3b8' }}>
                        {stat.icon}
                      </div>
                      <div className={`text-sm font-bold ${stat.highlight ? 'text-white' : 'text-slate-200'}`}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Best score */}
                {completedScores[selected] > 0 && (
                  <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
                    style={{ background: selectedColor.accent + '11', border: `1px solid ${selectedColor.accent}33` }}>
                    <Shield className="w-3.5 h-3.5" style={{ color: selectedColor.accent }} />
                    <span className="text-xs text-slate-300">
                      Your best: <span className="font-semibold" style={{ color: selectedColor.accent }}>{completedScores[selected]}</span>
                    </span>
                  </div>
                )}

                {/* Begin button */}
                <button
                  onClick={() => onSelectLevel(selected)}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${selectedColor.accent}cc, ${selectedColor.accent}88)`,
                    boxShadow: `0 4px 20px ${selectedColor.accent}44`,
                  }}
                >
                  <span>
                    {nodeStatus(selected) === 'completed' ? 'Play Again' : 'Begin Level'}
                  </span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
