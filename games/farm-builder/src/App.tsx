import { useEffect, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import GestureCursorDot from './components/common/GestureCursorDot';
import HandLostOverlay from './components/common/HandLostOverlay';
import CalibrationScreen from './components/menu/CalibrationScreen';
import MainMenu, { type MainMenuAction } from './components/menu/MainMenu';
import SettingsScreen from './components/menu/SettingsScreen';
import HowToPlayScreen from './components/menu/HowToPlayScreen';
import FarmScreen from './components/game/FarmScreen';
import { useFarmStore } from './stores/farmStore';
import { useSettingsStore } from './stores/settingsStore';
import { setVolumes, startMusic, stopMusic, unlockAudio } from './audio/sound';

type Screen = 'calibration' | 'how-to-play' | 'main-menu' | 'settings' | 'farm';

const CALIBRATED_KEY = 'farm-builder-calibrated-v1';

export default function App() {
  // Instructions open on every load, not just the first: calibration is
  // remembered per device, so a new player on a shared TV would otherwise
  // land on the menu without ever seeing how to play.
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(CALIBRATED_KEY) ? 'how-to-play' : 'calibration'));

  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const totalCoinsEarned = useFarmStore((s) => s.totalCoinsEarned);

  useEffect(() => { setVolumes(musicVolume, sfxVolume); }, [musicVolume, sfxVolume]);

  useEffect(() => {
    if (screen !== 'calibration') startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [screen]);

  function exitToPlatform() {
    stopMusic();
    // This is a persistent sim, not a scored round: submit lifetime coins earned so
    // far as the score, since it only ever grows — consistent with the platform's
    // "max score per user" leaderboard semantics used by every other game.
    window.parent?.postMessage({ type: 'GAME_COMPLETE', score: Math.round(totalCoinsEarned) }, '*');
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
    setScreen('farm');
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

      {screen === 'farm' && <FarmScreen onExit={() => setScreen('main-menu')} />}
    </GestureProvider>
  );
}
