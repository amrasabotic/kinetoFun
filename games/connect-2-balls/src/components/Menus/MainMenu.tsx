import { Play, Settings, Trophy, Zap, Clock, Sparkles, Calendar, Hand } from 'lucide-react';
import { Theme, GameMode } from '../../data/types';
import { GestureButton } from '../GestureUI';

interface MainMenuProps {
  theme: Theme;
  onStartCampaign: () => void;
  onStartMode: (mode: GameMode) => void;
  onSettings: () => void;
  onAchievements: () => void;
  totalStars: number;
  currentLevel: number;
}

export default function MainMenu({
  theme,
  onStartCampaign,
  onStartMode,
  onSettings,
  onAchievements,
  totalStars,
  currentLevel,
}: MainMenuProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: theme.background }}>
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10 animate-float"
            style={{
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              background: theme.particleColors[i % theme.particleColors.length],
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + i}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="relative z-10 text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Hand className="w-10 h-10" style={{ color: theme.accentColor }} />
          <h1 className="text-5xl font-bold tracking-tight" style={{ color: theme.textColor }}>
            KinetoFun
          </h1>
        </div>
        <p className="text-lg opacity-70 font-light" style={{ color: theme.textColor }}>
          Connect the dots with your hands
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-sm" style={{ color: theme.textColor }}>
          <span className="opacity-60">Level {currentLevel}</span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {totalStars}
          </span>
        </div>
      </div>

      {/* Main buttons */}
      <div className="relative z-10 w-full max-w-sm space-y-3">
        <GestureButton
          onActivate={onStartCampaign}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-semibold text-left"
          style={{
            background: theme.accentColor,
            color: theme.background.includes('#0') ? '#fff' : '#1a1a2e',
          }}
        >
          <Play className="w-6 h-6" />
          <div>
            <div className="text-base">Campaign</div>
            <div className="text-xs opacity-70 font-normal">Continue from Level {currentLevel}</div>
          </div>
        </GestureButton>

        <div className="grid grid-cols-2 gap-3">
          <GestureButton
            onActivate={() => onStartMode('zen')}
            className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl font-medium backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            <Sparkles className="w-5 h-5" style={{ color: theme.accentColor }} />
            <span className="text-sm">Zen Mode</span>
          </GestureButton>

          <GestureButton
            onActivate={() => onStartMode('timeAttack')}
            className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl font-medium backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            <Clock className="w-5 h-5" style={{ color: theme.accentColor }} />
            <span className="text-sm">Time Attack</span>
          </GestureButton>

          <GestureButton
            onActivate={() => onStartMode('endless')}
            className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl font-medium backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            <Zap className="w-5 h-5" style={{ color: theme.accentColor }} />
            <span className="text-sm">Endless</span>
          </GestureButton>

          <GestureButton
            onActivate={() => onStartMode('daily')}
            className="flex flex-col items-center gap-2 px-4 py-4 rounded-2xl font-medium backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
          >
            <Calendar className="w-5 h-5" style={{ color: theme.accentColor }} />
            <span className="text-sm">Daily</span>
          </GestureButton>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="relative z-10 flex items-center gap-4 mt-10">
        <GestureButton
          onActivate={onAchievements}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.08)', color: theme.textColor }}
        >
          <Trophy className="w-4 h-4" />
          Achievements
        </GestureButton>
        <GestureButton
          onActivate={onSettings}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.08)', color: theme.textColor }}
        >
          <Settings className="w-4 h-4" />
          Settings
        </GestureButton>
      </div>

      {/* Gesture hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs opacity-40" style={{ color: theme.textColor }}>
        Pinch to select - Open palm to go back
      </div>
    </div>
  );
}
