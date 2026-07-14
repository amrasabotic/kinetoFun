import { useEffect, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import GestureCursorDot from './components/common/GestureCursorDot';
import HandLostOverlay from './components/common/HandLostOverlay';
import CalibrationScreen from './components/menu/CalibrationScreen';
import MainMenu, { type MainMenuAction } from './components/menu/MainMenu';
import SettingsScreen from './components/menu/SettingsScreen';
import PetScreen from './components/game/PetScreen';
import { usePetStore } from './stores/petStore';
import { useSettingsStore } from './stores/settingsStore';
import { setVolumes, startMusic, stopMusic, unlockAudio } from './audio/sound';

type Screen = 'calibration' | 'main-menu' | 'settings' | 'pet';

const CALIBRATED_KEY = 'pocket-pal-calibrated-v1';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(CALIBRATED_KEY) ? 'main-menu' : 'calibration'));

  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const totalHeartsEarned = usePetStore((s) => s.totalHeartsEarned);

  useEffect(() => { setVolumes(musicVolume, sfxVolume); }, [musicVolume, sfxVolume]);

  useEffect(() => {
    if (screen !== 'calibration') startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [screen]);

  function exitToPlatform() {
    stopMusic();
    window.parent?.postMessage({ type: 'GAME_COMPLETE', score: Math.round(totalHeartsEarned) }, '*');
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
    setScreen('pet');
  }

  return (
    <GestureProvider>
      {screen !== 'calibration' && <GestureCursorDot />}
      {screen !== 'calibration' && <HandLostOverlay />}

      {screen === 'calibration' && <CalibrationScreen onDone={handleCalibrationDone} />}

      {screen === 'main-menu' && <MainMenu onSelect={handleMainMenuSelect} />}

      {screen === 'settings' && <SettingsScreen onBack={() => setScreen('main-menu')} />}

      {screen === 'pet' && <PetScreen onExit={() => setScreen('main-menu')} />}
    </GestureProvider>
  );
}
