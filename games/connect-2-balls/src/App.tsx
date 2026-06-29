import { useState, useCallback, useEffect } from 'react';
import { GameScreen, GameMode, LevelData, PlayerProgress, GameSettings, Theme } from './data/types';
import { levels } from './data/levels';
import { themes } from './data/themes';
import { loadProgress, saveProgress, loadSettings, saveSettings } from './systems/SaveSystem';
import { generateRandomLevel, generateDailyChallenge } from './systems/LevelGenerator';
import { achievements } from './data/achievements';
import { GestureProvider, useGestureEvent } from './systems/GestureManager';
import VirtualCursor from './components/VirtualCursor';
import HandLostOverlay from './components/HandLostOverlay';
import MainMenu from './components/Menus/MainMenu';
import LevelSelect from './components/Menus/LevelSelect';
import SettingsMenu from './components/Menus/SettingsMenu';
import AchievementsMenu from './components/Menus/AchievementsMenu';
import Tutorial from './components/Menus/Tutorial';
import GameBoard from './components/GameBoard/GameBoard';
import { PauseOverlay, LevelCompleteOverlay } from './components/Menus/Overlays';

function AppContent() {
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('campaign');
  const [paused, setPaused] = useState(false);
  const [showComplete, setShowComplete] = useState<{ score: number; stars: number } | null>(null);
  const [showTutorial] = useState(!localStorage.getItem('kinetofun_tutorial_done'));

  const currentTheme: Theme = themes.find((t) => t.id === progress.selectedTheme) ?? themes[0];

  useEffect(() => {
    if (showTutorial) setScreen('tutorial');
  }, []);

  // Open palm gesture -> navigate back from menus
  useGestureEvent('openPalm', useCallback(() => {
    if (screen === 'settings' || screen === 'achievements' || screen === 'levelSelect') {
      setScreen('menu');
    }
  }, [screen]));

  const updateProgress = useCallback((newProgress: PlayerProgress) => {
    setProgress(newProgress);
    saveProgress(newProgress);
  }, []);

  const updateSettings = useCallback((newSettings: GameSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  const startLevel = useCallback((levelId: number) => {
    const level = levels.find((l) => l.id === levelId) ?? levels[levels.length - 1];
    setCurrentLevel(level);
    setGameMode('campaign');
    setScreen('game');
    setPaused(false);
    setShowComplete(null);
  }, []);

  const startMode = useCallback((mode: GameMode) => {
    let level: LevelData;
    switch (mode) {
      case 'endless':
        level = generateRandomLevel(6, 4);
        break;
      case 'daily':
        level = generateDailyChallenge();
        break;
      case 'timeAttack':
        level = generateRandomLevel(5, 3);
        break;
      case 'zen':
        level = levels[Math.min(progress.currentLevel - 1, levels.length - 1)] ?? levels[0];
        break;
      default:
        level = levels[Math.min(progress.currentLevel - 1, levels.length - 1)] ?? levels[0];
    }
    setCurrentLevel(level);
    setGameMode(mode);
    setScreen('game');
    setPaused(false);
    setShowComplete(null);
  }, [progress.currentLevel]);

  const handleLevelComplete = useCallback((score: number, stars: number) => {
    if (!currentLevel) return;

    const newProgress = { ...progress };
    const existing = newProgress.completedLevels[currentLevel.id];

    if (currentLevel.id > 0) {
      newProgress.completedLevels[currentLevel.id] = {
        stars: Math.max(existing?.stars ?? 0, stars),
        bestTime: Math.min(existing?.bestTime ?? Infinity, 0),
        score: Math.max(existing?.score ?? 0, score),
      };

      if (currentLevel.id >= newProgress.currentLevel) {
        newProgress.currentLevel = currentLevel.id + 1;
      }

      newProgress.totalStars = Object.values(newProgress.completedLevels).reduce((sum, l) => sum + l.stars, 0);
      newProgress.combo += 1;
    }

    const completedCount = Object.keys(newProgress.completedLevels).length;
    const perfectCount = Object.values(newProgress.completedLevels).filter((l) => l.stars === 3).length;
    for (const ach of achievements) {
      if (!newProgress.achievements.includes(ach.id)) {
        if (ach.condition({ completedLevels: completedCount, perfectLevels: perfectCount, totalStars: newProgress.totalStars, hintsUsed: false, speed: false })) {
          newProgress.achievements.push(ach.id);
        }
      }
    }

    for (const t of themes) {
      if (t.unlockLevel <= completedCount && !newProgress.unlockedThemes.includes(t.id)) {
        newProgress.unlockedThemes.push(t.id);
      }
    }

    updateProgress(newProgress);
    setShowComplete({ score, stars });
  }, [currentLevel, progress, updateProgress]);

  const handleNextLevel = useCallback(() => {
    if (!currentLevel) return;
    const nextId = currentLevel.id + 1;
    const nextLevel = levels.find((l) => l.id === nextId);
    if (nextLevel) {
      setCurrentLevel(nextLevel);
      setShowComplete(null);
    } else {
      setScreen('menu');
      setShowComplete(null);
    }
  }, [currentLevel]);

  const handleReplay = useCallback(() => {
    setShowComplete(null);
    if (gameMode === 'endless' || gameMode === 'timeAttack') {
      const size = gameMode === 'endless' ? 6 : 5;
      const pairs = gameMode === 'endless' ? 4 : 3;
      setCurrentLevel(generateRandomLevel(size, pairs));
    }
  }, [gameMode]);

  const handleHint = useCallback(() => {
    if (progress.hints > 0) {
      updateProgress({ ...progress, hints: progress.hints - 1 });
    }
  }, [progress, updateProgress]);

  if (screen === 'tutorial') {
    return (
      <Tutorial
        theme={currentTheme}
        onComplete={() => {
          localStorage.setItem('kinetofun_tutorial_done', 'true');
          setScreen('menu');
        }}
      />
    );
  }

  if (screen === 'menu') {
    return (
      <MainMenu
        theme={currentTheme}
        onStartCampaign={() => startLevel(progress.currentLevel)}
        onStartMode={startMode}
        onSettings={() => setScreen('settings')}
        onAchievements={() => setScreen('achievements')}
        totalStars={progress.totalStars}
        currentLevel={progress.currentLevel}
      />
    );
  }

  if (screen === 'levelSelect') {
    return (
      <LevelSelect
        theme={currentTheme}
        progress={progress}
        onSelectLevel={startLevel}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'settings') {
    return (
      <SettingsMenu
        theme={currentTheme}
        settings={settings}
        onUpdate={updateSettings}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'achievements') {
    return (
      <AchievementsMenu
        theme={currentTheme}
        unlockedAchievements={progress.achievements}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'game' && currentLevel) {
    return (
      <div className="min-h-screen relative" style={{ background: currentTheme.background }}>
        <GameBoard
          key={currentLevel.id + '-' + gameMode}
          level={currentLevel}
          theme={currentTheme}
          mode={gameMode}
          settings={settings}
          onComplete={handleLevelComplete}
          onPause={() => setPaused(true)}
          onHint={handleHint}
          hintsAvailable={progress.hints}
        />

        {paused && (
          <PauseOverlay
            theme={currentTheme}
            onResume={() => setPaused(false)}
            onRestart={handleReplay}
            onHome={() => { setScreen('menu'); setPaused(false); }}
          />
        )}

        {showComplete && (
          <LevelCompleteOverlay
            theme={currentTheme}
            score={showComplete.score}
            stars={showComplete.stars}
            onNext={handleNextLevel}
            onReplay={handleReplay}
            onHome={() => { setScreen('menu'); setShowComplete(null); }}
            hasNextLevel={gameMode === 'campaign' && !!levels.find((l) => l.id === (currentLevel?.id ?? 0) + 1)}
          />
        )}
      </div>
    );
  }

  return null;
}

function App() {
  const [settings] = useState<GameSettings>(loadSettings);

  return (
    <GestureProvider
      settings={{
        sensitivity: settings.sensitivity,
        leftHanded: settings.leftHanded,
        largeCursor: settings.largeCursor,
        smoothing: 0.3,
        snapStrength: 0.4,
        pinchThreshold: 0.06,
        holdDuration: 800,
      }}
    >
      <div className="cursor-none">
        <AppContent />
        <VirtualCursor />
        <HandLostOverlay />
      </div>
    </GestureProvider>
  );
}

export default App;
