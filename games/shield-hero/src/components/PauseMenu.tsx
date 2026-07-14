import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onQuit,
  soundEnabled,
  onToggleSound
}) => {
  return (
    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-30">
      <div className="flex flex-col items-center gap-6">
        <h2 className="text-4xl font-bold text-white mb-4">Paused</h2>

        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-3 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 w-48"
          >
            <Play className="w-5 h-5" />
            Resume
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-3 px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 w-48"
          >
            <RotateCcw className="w-5 h-5" />
            Restart
          </button>

          <button
            onClick={onQuit}
            className="flex items-center justify-center gap-3 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 w-48"
          >
            <Home className="w-5 h-5" />
            Quit
          </button>
        </div>

        <button
          onClick={onToggleSound}
          className="p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors mt-4"
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
