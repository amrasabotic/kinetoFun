import React from 'react';
import { Shield, Infinity, BookOpen, Volume2, VolumeX } from 'lucide-react';

interface MenuProps {
  onStartStory: () => void;
  onStartEndless: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isInitializing: boolean;
  initError: string | null;
}

export const Menu: React.FC<MenuProps> = ({
  onStartStory,
  onStartEndless,
  soundEnabled,
  onToggleSound,
  isInitializing,
  initError
}) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: i % 2 === 0
                  ? 'radial-gradient(circle, rgba(78, 204, 167, 0.3) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-12 relative">
          <Shield
            className="w-32 h-32 text-emerald-400 animate-bounce"
            style={{ animationDuration: '2s' }}
          />
          <div className="absolute inset-0 blur-xl bg-emerald-400/30 rounded-full" />
        </div>

        <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-emerald-400 via-cyan-400 to-yellow-400 bg-clip-text text-transparent">
          Shield Hero
        </h1>

        <p className="text-slate-400 text-lg mb-12">
          Use your hand to block apples and catch stars
        </p>

        {initError && (
          <div className="mb-6 px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {initError}
          </div>
        )}

        <div className="flex flex-col gap-4 w-64">
          <button
            onClick={onStartStory}
            disabled={isInitializing}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-wait text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-emerald-500/30 disabled:shadow-none"
          >
            <BookOpen className="w-5 h-5" />
            Story Mode
          </button>

          <button
            onClick={onStartEndless}
            disabled={isInitializing}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-orange-500/30 disabled:shadow-none"
          >
            <Infinity className="w-5 h-5" />
            Endless Mode
          </button>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={onToggleSound}
            className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        <div className="mt-12 text-slate-500 text-sm text-center max-w-md">
          <p className="mb-2">Controls:</p>
          <p>Position your finger along the dotted circle to rotate your shield</p>
          <p className="mt-2 text-amber-400">Block apples - Catch stars</p>
        </div>
      </div>
    </div>
  );
};
