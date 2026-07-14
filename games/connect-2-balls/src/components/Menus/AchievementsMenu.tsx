import { ArrowLeft } from 'lucide-react';
import { Theme } from '../../data/types';
import { achievements } from '../../data/achievements';
import { GestureButton } from '../GestureUI';

interface AchievementsMenuProps {
  theme: Theme;
  unlockedAchievements: string[];
  onBack: () => void;
}

export default function AchievementsMenu({ theme, unlockedAchievements, onBack }: AchievementsMenuProps) {
  return (
    <div className="min-h-screen flex flex-col p-6" style={{ background: theme.background }}>
      <div className="flex items-center gap-4 mb-8">
        <GestureButton
          onActivate={onBack}
          className="p-2 rounded-full backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
        >
          <ArrowLeft className="w-5 h-5" />
        </GestureButton>
        <h2 className="text-2xl font-bold" style={{ color: theme.textColor }}>Achievements</h2>
        <span className="text-sm opacity-60 ml-auto" style={{ color: theme.textColor }}>
          {unlockedAchievements.length}/{achievements.length}
        </span>
      </div>

      <div className="max-w-lg mx-auto w-full grid gap-3">
        {achievements.map((ach) => {
          const unlocked = unlockedAchievements.includes(ach.id);
          return (
            <div
              key={ach.id}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all ${unlocked ? '' : 'opacity-40'}`}
              style={{
                background: unlocked ? `${theme.accentColor}15` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${unlocked ? `${theme.accentColor}40` : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: unlocked ? `${theme.accentColor}30` : 'rgba(255,255,255,0.1)',
                }}
              >
                <span className="text-lg" style={{ color: theme.textColor }}>
                  {unlocked ? '!' : '?'}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm" style={{ color: theme.textColor }}>
                  {ach.name}
                </div>
                <div className="text-xs opacity-60" style={{ color: theme.textColor }}>
                  {ach.description}
                </div>
              </div>
              {unlocked && (
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Gesture hint */}
      <div className="mt-8 text-center text-xs opacity-40" style={{ color: theme.textColor }}>
        Swipe up/down to scroll - Open palm to go back
      </div>
    </div>
  );
}
