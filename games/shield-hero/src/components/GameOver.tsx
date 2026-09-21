import React from 'react';
import { GameStats } from '../types/game';
import { RotateCcw, Home, Trophy } from 'lucide-react';

interface GameOverProps {
  stats: GameStats;
  onRestart: () => void;
  onQuit: () => void;
  isNewHighScore: boolean;
}

export const GameOver: React.FC<GameOverProps> = ({
  stats,
  onRestart,
  onQuit,
  isNewHighScore
}) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 flex items-center justify-center z-30">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="text-6xl font-bold text-red-400 mb-2">Game Over</h2>

          {isNewHighScore && (
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-4 animate-pulse">
              <Trophy className="w-6 h-6" />
              <span className="text-xl font-bold">New High Score!</span>
              <Trophy className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 bg-slate-800/80 px-8 py-6 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-8 text-xl">
            <span className="text-slate-400">Score</span>
            <span className="text-white font-bold">{stats.score.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between gap-8">
            <span className="text-slate-400 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              Stars
            </span>
            <span className="text-amber-400 font-semibold">{stats.starsCollected}</span>
          </div>

          <div className="flex items-center justify-between gap-8">
            <span className="text-slate-400 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              Blocked
            </span>
            <span className="text-red-400 font-semibold">{stats.applesBlocked}</span>
          </div>

          <div className="h-px bg-slate-700 my-2" />

          <div className="flex items-center justify-between gap-8">
            <span className="text-slate-400">Level Reached</span>
            <span className="text-emerald-400 font-semibold">{stats.level}</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>

          <button
            onClick={onQuit}
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            <Home className="w-5 h-5" />
            Menu
          </button>
        </div>
      </div>
    </div>
  );
};
