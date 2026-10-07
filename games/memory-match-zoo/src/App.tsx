import { useEffect, useRef, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import GestureCursorDot from './components/common/GestureCursorDot';
import HandLostOverlay from './components/common/HandLostOverlay';
import CalibrationScreen from './components/menu/CalibrationScreen';
import MainMenu, { type MainMenuAction } from './components/menu/MainMenu';
import SettingsScreen from './components/menu/SettingsScreen';
import HowToPlayScreen from './components/menu/HowToPlayScreen';
import GameplayScreen from './components/game/GameplayScreen';
import EndScreen from './components/game/EndScreen';
import { useProgressStore } from './stores/progressStore';
import { useSettingsStore } from './stores/settingsStore';
import type { BoardSize, SessionResult } from './types';
import { setVolumes, startMusic, stopMusic, unlockAudio } from './audio/sound';

type Screen = 'calibration' | 'how-to-play' | 'main-menu' | 'settings' | 'gameplay' | 'end-screen';

const CALIBRATED_KEY = 'memory-match-zoo-calibrated-v1';

export default function App() {
  // Instructions open on every load, not just the first: calibration is
  // remembered per device, so a new player on a shared TV would otherwise
  // land on the menu without ever seeing how to play.
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(CALIBRATED_KEY) ? 'how-to-play' : 'calibration'));
  const [size, setSize] = useState<BoardSize>('small');
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [runId, setRunId] = useState(0);
  const sessionScoreRef = useRef(0);

  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const recordSessionResult = useProgressStore((s) => s.recordSessionResult);

  useEffect(() => { setVolumes(musicVolume, sfxVolume); }, [musicVolume, sfxVolume]);

  useEffect(() => {
    if (screen === 'how-to-play' || screen === 'main-menu' || screen === 'settings') startMusic();
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
    setScreen('how-to-play');
  }

  function handleMainMenuSelect(action: MainMenuAction) {
    unlockAudio();
    if (action === 'exit') { exitToPlatform(); return; }
    if (action === 'settings') { setScreen('settings'); return; }
    if (action === 'how-to-play') { setScreen('how-to-play'); return; }
    setSize(action);
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

      {screen === 'how-to-play' && (

        <HowToPlayScreen onDone={() => { unlockAudio(); setScreen('main-menu'); }} doneLabel="Let's Play!" />

      )}


      {screen === 'main-menu' && <MainMenu onSelect={handleMainMenuSelect} />}

      {screen === 'settings' && <SettingsScreen onBack={() => setScreen('main-menu')} />}

      {screen === 'gameplay' && (
        <GameplayScreen
          key={`${size}-${runId}`}
          size={size}
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
