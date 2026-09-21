import { useEffect, useRef, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import GestureCursorDot from './components/common/GestureCursorDot';
import HandLostOverlay from './components/common/HandLostOverlay';
import CalibrationScreen from './components/menu/CalibrationScreen';
import MainMenu, { type MainMenuAction } from './components/menu/MainMenu';
import SettingsScreen from './components/menu/SettingsScreen';
import GameplayScreen from './components/game/GameplayScreen';
import EndScreen from './components/game/EndScreen';
import { useProgressStore } from './stores/progressStore';
import { useSettingsStore } from './stores/settingsStore';
import type { SessionResult, SortMode } from './types';
import { setVolumes, startMusic, stopMusic, unlockAudio } from './audio/sound';

type Screen = 'calibration' | 'main-menu' | 'settings' | 'gameplay' | 'end-screen';

const CALIBRATED_KEY = 'shape-color-sorter-calibrated-v1';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(CALIBRATED_KEY) ? 'main-menu' : 'calibration'));
  const [mode, setMode] = useState<SortMode>('shape');
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [runId, setRunId] = useState(0);
  const sessionScoreRef = useRef(0);

  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const recordSessionResult = useProgressStore((s) => s.recordSessionResult);

  useEffect(() => { setVolumes(musicVolume, sfxVolume); }, [musicVolume, sfxVolume]);

  useEffect(() => {
    if (screen === 'main-menu' || screen === 'settings') startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [screen]);

  function exitToPlatform() {
    stopMusic();
    window.parent?.postMessage({ type: 'GAME_COMPLETE', score: Math.round(sessionScoreRef.current) }, '*');
  }

  function handleCalibrationDone() {
    unlockAudio();
    localStorage.setItem(CALIBRATED_KEY, '1');
    setScreen('main-menu');
  }

  function handleMainMenuSelect(action: MainMenuAction) {
    unlockAudio();
    if (action === 'exit') { exitToPlatform(); return; }
    if (action === 'settings') { setScreen('settings'); return; }
    setMode(action);
    setRunId((n) => n + 1);
    setScreen('gameplay');
  }

  function handleSessionComplete(result: SessionResult) {
    const unlocked = recordSessionResult(result);
    sessionScoreRef.current += result.score;
    setNewAchievements(unlocked);
    setLastResult(result);
    setScreen('end-screen');
  }

  function handlePlayAgain() {
    setRunId((n) => n + 1);
    setScreen('gameplay');
  }

  return (
    <GestureProvider>
      {screen !== 'calibration' && <GestureCursorDot />}
      {screen !== 'calibration' && <HandLostOverlay />}

      {screen === 'calibration' && <CalibrationScreen onDone={handleCalibrationDone} />}

      {screen === 'main-menu' && <MainMenu onSelect={handleMainMenuSelect} />}

      {screen === 'settings' && <SettingsScreen onBack={() => setScreen('main-menu')} />}

      {screen === 'gameplay' && (
        <GameplayScreen
          key={`${mode}-${runId}`}
          mode={mode}
          onExit={() => setScreen('main-menu')}
          onSessionComplete={handleSessionComplete}
        />
      )}

      {screen === 'end-screen' && lastResult && (
        <EndScreen
          result={lastResult}
          newAchievements={newAchievements}
          onPlayAgain={handlePlayAgain}
          onMainMenu={() => setScreen('main-menu')}
        />
      )}
    </GestureProvider>
  );
}
