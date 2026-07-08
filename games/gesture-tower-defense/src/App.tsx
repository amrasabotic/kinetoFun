import { useEffect, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import GestureCursorDot from './components/common/GestureCursorDot';
import HandLostOverlay from './components/common/HandLostOverlay';
import CalibrationScreen from './components/menu/CalibrationScreen';
import MainMenu, { type MainMenuAction } from './components/menu/MainMenu';
import MapSelect from './components/menu/MapSelect';
import StatisticsScreen from './components/menu/StatisticsScreen';
import SettingsScreen from './components/menu/SettingsScreen';
import CreditsScreen from './components/menu/CreditsScreen';
import { GameScreen, type BattleResult } from './components/game/GameScreen';
import { useSettingsStore } from './stores/settingsStore';
import { useGameStore, todayIso, hasDailyCompletedToday } from './stores/gameStore';
import { setVolumes, startMusic, stopMusic, unlockAudio } from './audio/sound';
import { campaignLevelConfig } from './systems/campaign';
import { MAPS } from './data/maps';
import { dailySeed } from './utils/helpers';
import type { GameMode } from './types';

type Screen = 'calibration' | 'main-menu' | 'map-select' | 'statistics' | 'settings' | 'credits' | 'game';

const CALIBRATED_KEY = 'gesture-tower-defense-calibrated-v1';
const DAILY_TOTAL_WAVES = 8;
const ENDLESS_TOTAL_WAVES = 999_999; // effectively infinite — the engine's "won" check never reaches this

interface Launch {
  mode: GameMode;
  mapId: string;
  totalWaves: number;
  startingCurrency: number;
  startingBaseHealth: number;
  seed: number;
  levelLabel: string;
  campaignLevel?: number;
}

function randomSeed() {
  return Math.floor(Math.random() * 1e9);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(CALIBRATED_KEY) ? 'main-menu' : 'calibration'));
  const [launch, setLaunch] = useState<Launch | null>(null);

  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const campaignStars = useGameStore((s) => s.campaignStars);
  const campaignHighestUnlocked = useGameStore((s) => s.campaignHighestUnlocked);
  const dailyCompletions = useGameStore((s) => s.dailyCompletions);

  useEffect(() => {
    setVolumes(musicVolume, sfxVolume);
  }, [musicVolume, sfxVolume]);

  useEffect(() => {
    if (screen !== 'calibration') startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [screen]);

  function handleCalibrationDone() {
    unlockAudio();
    localStorage.setItem(CALIBRATED_KEY, '1');
    setScreen('main-menu');
  }

  function handleMainMenuSelect(action: MainMenuAction) {
    unlockAudio();
    if (action === 'campaign') {
      setScreen('map-select');
      return;
    }
    if (action === 'endless') {
      setLaunch({
        mode: 'endless',
        mapId: MAPS[0].id,
        totalWaves: ENDLESS_TOTAL_WAVES,
        startingCurrency: 150,
        startingBaseHealth: 20,
        seed: randomSeed(),
        levelLabel: 'Endless',
      });
      setScreen('game');
      return;
    }
    if (action === 'daily') {
      setLaunch({
        mode: 'daily',
        mapId: MAPS[0].id,
        totalWaves: DAILY_TOTAL_WAVES,
        startingCurrency: 150,
        startingBaseHealth: 20,
        seed: dailySeed(),
        levelLabel: "Today's Challenge",
      });
      setScreen('game');
      return;
    }
    setScreen(action);
  }

  function handlePickCampaignLevel(level: number) {
    const config = campaignLevelConfig(level);
    setLaunch({
      mode: 'campaign',
      mapId: config.mapId,
      totalWaves: config.totalWaves,
      startingCurrency: config.startingCurrency,
      startingBaseHealth: config.startingBaseHealth,
      seed: randomSeed(),
      levelLabel: `Level ${level}`,
      campaignLevel: level,
    });
    setScreen('game');
  }

  function handleGameResult(result: BattleResult) {
    if (!launch) return;
    if (launch.mode === 'campaign' && launch.campaignLevel !== undefined) {
      // Graded on how much base health survived the run — a flawless clear
      // earns 3 stars, a scraped-through win still earns at least 1.
      const stars: 1 | 2 | 3 = result.baseHealthFraction >= 0.8 ? 3 : result.baseHealthFraction >= 0.4 ? 2 : 1;
      useGameStore.getState().recordCampaignResult(launch.campaignLevel, result.won, stars);
    } else if (launch.mode === 'endless') {
      useGameStore.getState().recordEndlessResult(result.wavesCleared);
    } else if (launch.mode === 'daily') {
      useGameStore.getState().recordDailyResult(todayIso(), { wavesCleared: result.wavesCleared, won: result.won });
    }
    window.parent?.postMessage({ type: 'GAME_COMPLETE', score: Math.round(useGameStore.getState().lifetimeScore) }, '*');
  }

  return (
    <GestureProvider>
      {screen !== 'calibration' && <GestureCursorDot />}
      {screen !== 'calibration' && <HandLostOverlay />}

      {screen === 'calibration' && <CalibrationScreen onDone={handleCalibrationDone} />}

      {screen === 'main-menu' && <MainMenu onSelect={handleMainMenuSelect} dailyDone={hasDailyCompletedToday(dailyCompletions)} />}

      {screen === 'map-select' && (
        <MapSelect
          highestUnlocked={campaignHighestUnlocked}
          stars={campaignStars}
          onPick={handlePickCampaignLevel}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'statistics' && <StatisticsScreen onBack={() => setScreen('main-menu')} />}

      {screen === 'settings' && <SettingsScreen onBack={() => setScreen('main-menu')} />}

      {screen === 'credits' && <CreditsScreen onBack={() => setScreen('main-menu')} />}

      {screen === 'game' && launch && (
        <GameScreen
          key={`${launch.mode}-${launch.mapId}-${launch.seed}`}
          mode={launch.mode}
          mapId={launch.mapId}
          totalWaves={launch.totalWaves}
          startingCurrency={launch.startingCurrency}
          startingBaseHealth={launch.startingBaseHealth}
          seed={launch.seed}
          levelLabel={launch.levelLabel}
          onExit={() => setScreen(launch.mode === 'campaign' ? 'map-select' : 'main-menu')}
          onResult={handleGameResult}
        />
      )}
    </GestureProvider>
  );
}
