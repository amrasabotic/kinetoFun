import { ArrowLeft, Lock, Star } from 'lucide-react';
import { Theme, PlayerProgress } from '../../data/types';
import { levels } from '../../data/levels';
import { GestureButton } from '../GestureUI';

interface LevelSelectProps {
  theme: Theme;
  progress: PlayerProgress;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export default function LevelSelect({ theme, progress, onSelectLevel, onBack }: LevelSelectProps) {
  return (
    <div className="min-h-screen flex flex-col p-6" style={{ background: theme.background }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <GestureButton
          onActivate={onBack}
          className="p-2 rounded-full backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
        >
          <ArrowLeft className="w-5 h-5" />
        </GestureButton>
        <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>
          Select Level
        </h2>
      </div>

      {/* Grid of levels */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-w-2xl mx-auto w-full">
        {levels.map((level) => {
          const completed = progress.completedLevels[level.id];
          const unlocked = level.id <= progress.currentLevel;
          const stars = completed?.stars ?? 0;

          return (
            <GestureButton
              key={level.id}
              onActivate={() => onSelectLevel(level.id)}
              disabled={!unlocked}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center ${
                !unlocked ? 'opacity-40' : ''
              }`}
              style={{
                background: completed ? `${theme.accentColor}20` : 'rgba(255,255,255,0.08)',
                border: `2px solid ${completed ? theme.accentColor : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {unlocked ? (
                <>
                  <span className="text-lg font-bold" style={{ color: theme.textColor }}>
                    {level.id}
                  </span>
                  {stars > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Lock className="w-5 h-5 opacity-50" style={{ color: theme.textColor }} />
              )}
            </GestureButton>
          );
        })}
      </div>

      {/* Gesture hint */}
      <div className="mt-8 text-center text-xs opacity-40" style={{ color: theme.textColor }}>
        Pinch to select level - Open palm to go back
      </div>
    </div>
  );
}
