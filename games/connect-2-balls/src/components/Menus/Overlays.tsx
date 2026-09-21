import { Home, RotateCcw, ArrowRight, Play } from 'lucide-react';
import { Theme } from '../../data/types';
import { GestureButton } from '../GestureUI';

interface PauseOverlayProps {
  theme: Theme;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export function PauseOverlay({ theme, onResume, onRestart, onHome }: PauseOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="p-8 rounded-3xl text-center max-w-sm w-full mx-4"
        style={{ background: theme.background }}
      >
        <h2 className="text-2xl font-bold mb-6" style={{ color: theme.textColor }}>Paused</h2>
        <div className="space-y-3">
          <GestureButton
            onActivate={onResume}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold"
            style={{ background: theme.accentColor, color: '#1a1a2e' }}
          >
            <Play className="w-5 h-5" />
            Resume
          </GestureButton>
          <GestureButton
            onActivate={onRestart}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            <RotateCcw className="w-5 h-5" />
            Restart Level
          </GestureButton>
          <GestureButton
            onActivate={onHome}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            <Home className="w-5 h-5" />
            Main Menu
          </GestureButton>
        </div>
        <div className="mt-4 text-xs opacity-40" style={{ color: theme.textColor }}>
          Pinch to select - Closed fist to resume
        </div>
      </div>
    </div>
  );
}

interface LevelCompleteOverlayProps {
  theme: Theme;
  score: number;
  stars: number;
  onNext: () => void;
  onReplay: () => void;
  onHome: () => void;
  hasNextLevel: boolean;
}

export function LevelCompleteOverlay({ theme, score, stars, onNext, onReplay, onHome, hasNextLevel }: LevelCompleteOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="p-8 rounded-3xl text-center max-w-sm w-full mx-4 animate-scale-in"
        style={{ background: theme.background }}
      >
        <h2 className="text-3xl font-bold mb-4" style={{ color: theme.accentColor }}>
          Level Complete!
        </h2>

        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <svg
              key={s}
              className={`w-10 h-10 transition-all ${s <= stars ? 'text-yellow-400 animate-star-pop' : 'text-gray-600'}`}
              style={{ animationDelay: `${s * 200}ms` }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>

        <div className="text-lg mb-6 opacity-80" style={{ color: theme.textColor }}>
          Score: {score}
        </div>

        <div className="space-y-3">
          {hasNextLevel && (
            <GestureButton
              onActivate={onNext}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold"
              style={{ background: theme.accentColor, color: '#1a1a2e' }}
            >
              <ArrowRight className="w-5 h-5" />
              Next Level
            </GestureButton>
          )}
          <GestureButton
            onActivate={onReplay}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            <RotateCcw className="w-5 h-5" />
            Replay
          </GestureButton>
          <GestureButton
            onActivate={onHome}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-medium"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            <Home className="w-5 h-5" />
            Main Menu
          </GestureButton>
        </div>

        <div className="mt-4 text-xs opacity-40" style={{ color: theme.textColor }}>
          Pinch to select
        </div>
      </div>
    </div>
  );
}
