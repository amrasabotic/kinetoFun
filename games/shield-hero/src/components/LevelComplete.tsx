import React from 'react';
import { GameStats, Level } from '../types/game';
import { ChevronRight, Trophy } from 'lucide-react';
import { levels } from '../data/levels';

interface LevelCompleteProps {
  stats: GameStats;
  completedLevel: Level;
  onNextLevel: () => void;
  onQuit: () => void;
}

export const LevelComplete: React.FC<LevelCompleteProps> = ({
  stats,
  completedLevel,
  onNextLevel,
  onQuit
}) => {
  const hasNextLevel = completedLevel.id < levels.length;

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 flex items-center justify-center z-30">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
            <Trophy className="w-8 h-8" />
            <h2 className="text-5xl font-bold">Level Complete!</h2>
            <Trophy className="w-8 h-8" />
          </div>
          <p className="text-xl text-slate-400">{completedLevel.name}</p>
        </div>

        <div className="flex flex-col gap-4 bg-slate-800/80 px-8 py-6 rounded-2xl backdrop-blur-sm w-80">
          <div className="flex items-center justify-between text-xl">
            <span className="text-slate-400">Score</span>
            <span className="text-white font-bold">{stats.score.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              Stars
            </span>
            <span className="text-amber-400 font-semibold">{stats.starsCollected}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              Blocked
            </span>
            <span className="text-red-400 font-semibold">{stats.applesBlocked}</span>
          </div>
        </div>

        <div className="flex gap-4">
          {hasNextLevel && (
            <button
              onClick={onNextLevel}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              Next Level
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onQuit}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            Menu
          </button>
        </div>

        {hasNextLevel && (
          <p className="text-slate-500 text-sm">
            Next: Level {completedLevel.id + 1} - {levels[completedLevel.id].name}
          </p>
        )}
      </div>
    </div>
  );
};
