import { useCallback, useEffect, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import { useGesture } from './hooks/useGesture';
import { CameraGate } from './components/CameraGate';
import { CalibrationScreen } from './components/CalibrationScreen';
import { MainMenu } from './components/MainMenu';
import { LevelSelect } from './components/LevelSelect';
import { StatisticsScreen } from './components/StatisticsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { CreditsScreen } from './components/CreditsScreen';
import { GameScreen, type WinResult } from './components/GameScreen';
import type { GameMode, Settings } from './types';
import {
  loadSave,
  recordLevelWin,
  recordEndlessLevel,
  recordAbandoned,
  updateSettings,
  resetProgress,
  hasDailyCompletedToday,
  type SaveData,
} from './systems/save';
import { setMusicVolume, setSfxVolume, startAmbientMusic } from './systems/audio';
import { dailySeed } from './utils/helpers';

type ScreenName = 'menu' | 'levelSelect' | 'statistics' | 'settings' | 'credits' | 'game';

interface Launch {
  mode: GameMode;
  level: number;
  seed: number;
}

const DAILY_LEVEL_REF = 25; // a fixed mid-tier difficulty for the shared daily puzzle — only the layout varies, seeded by date

function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}

interface AppShellProps {
  save: SaveData;
  setSave: (save: SaveData) => void;
}

function AppShell({ save, setSave }: AppShellProps) {
  const gesture = useGesture();
  const [screen, setScreen] = useState<ScreenName>('menu');
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [runKey, setRunKey] = useState(0);

  const goToGame = useCallback((mode: GameMode, level: number, seed: number) => {
    setLaunch({ mode, level, seed });
    setRunKey((k) => k + 1);
    setScreen('game');
  }, []);

  const handlePlay = useCallback(() => goToGame('levels', save.highestLevelUnlocked, randomSeed()), [goToGame, save.highestLevelUnlocked]);
  const handlePickLevel = useCallback((level: number) => goToGame('levels', level, randomSeed()), [goToGame]);
  const handleEndless = useCallback(() => goToGame('endless', 1, randomSeed()), [goToGame]);
  const handleDaily = useCallback(() => goToGame('daily', DAILY_LEVEL_REF, dailySeed()), [goToGame]);

  const handleExit = useCallback(() => {
    if (launch) {
      // Leaving mid-puzzle without solving breaks the win streak, same as any other abandoned attempt.
      setSave(recordAbandoned());
    }
    setLaunch(null);
    setScreen('menu');
  }, [launch, setSave]);

  const handleRestart = useCallback(() => {
    if (!launch) return;
    setLaunch({ ...launch, seed: launch.mode === 'daily' ? launch.seed : randomSeed() });
    setRunKey((k) => k + 1);
  }, [launch]);

  const handleAdvance = useCallback(() => {
    if (!launch) return;
    setLaunch({ ...launch, level: launch.level + 1, seed: randomSeed() });
    setRunKey((k) => k + 1);
  }, [launch]);

  const handleWin = useCallback(
    (result: WinResult) => {
      if (result.mode === 'endless') {
        setSave(recordEndlessLevel(result.level));
      } else {
        setSave(recordLevelWin(result.mode, result.level, result.stars, result.movesUsed, result.hintsUsed, result.undosUsed, result.elapsedMs));
      }
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score: result.score }, '*');
    },
    [setSave],
  );

  const handleSettingsChange = useCallback((partial: Partial<Settings>) => setSave(updateSettings(partial)), [setSave]);
  const handleResetProgress = useCallback(() => setSave(resetProgress()), [setSave]);

  if (screen === 'game' && launch) {
    return (
      <GameScreen
        key={`${launch.mode}-${launch.level}-${launch.seed}-${runKey}`}
        mode={launch.mode}
        level={launch.level}
        seed={launch.seed}
        settings={save.settings}
        onExit={handleExit}
        onWin={handleWin}
        onAdvance={launch.mode === 'levels' || launch.mode === 'endless' ? handleAdvance : null}
        onRestart={handleRestart}
      />
    );
  }

  switch (screen) {
    case 'levelSelect':
      return (
        <LevelSelect
          highestUnlocked={save.highestLevelUnlocked}
          levelStars={save.levelStars}
          onPick={handlePickLevel}
          onBack={() => setScreen('menu')}
          gesture={gesture}
        />
      );
    case 'statistics':
      return <StatisticsScreen stats={save.stats} onBack={() => setScreen('menu')} gesture={gesture} />;
    case 'settings':
      return (
        <SettingsScreen
          settings={save.settings}
          onChange={handleSettingsChange}
          onResetProgress={handleResetProgress}
          onBack={() => setScreen('menu')}
          gesture={gesture}
        />
      );
    case 'credits':
      return <CreditsScreen onBack={() => setScreen('menu')} gesture={gesture} />;
    default:
      return (
        <MainMenu
          onPlay={handlePlay}
          onLevelSelect={() => setScreen('levelSelect')}
          onEndless={handleEndless}
          onDaily={handleDaily}
          onStatistics={() => setScreen('statistics')}
          onSettings={() => setScreen('settings')}
          onCredits={() => setScreen('credits')}
          dailyDone={hasDailyCompletedToday()}
          gesture={gesture}
        />
      );
  }
}

export default function App() {
  const [calibrated, setCalibrated] = useState(false);
  const [save, setSave] = useState<SaveData>(() => loadSave());

  useEffect(() => {
    startAmbientMusic(save.settings.musicVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMusicVolume(save.settings.musicVolume);
  }, [save.settings.musicVolume]);

  useEffect(() => {
    setSfxVolume(save.settings.sfxVolume);
  }, [save.settings.sfxVolume]);

  return (
    <GestureProvider cursorSpeed={save.settings.cursorSpeed} pinchSensitivity={save.settings.gestureSensitivity}>
      <div className="lp-app">
        <CameraGate>
          {calibrated ? <AppShell save={save} setSave={setSave} /> : <CalibrationScreen onComplete={() => setCalibrated(true)} />}
        </CameraGate>
      </div>
    </GestureProvider>
  );
}
