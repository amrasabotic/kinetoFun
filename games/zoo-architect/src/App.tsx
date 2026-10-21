import { useEffect, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import GestureCursorDot from './components/common/GestureCursorDot';
import HandLostOverlay from './components/common/HandLostOverlay';
import CalibrationScreen from './components/menu/CalibrationScreen';
import MainMenu, { type MainMenuAction } from './components/menu/MainMenu';
import SettingsScreen from './components/menu/SettingsScreen';
import HowToPlayScreen from './components/menu/HowToPlayScreen';
import ZooScreen from './components/game/ZooScreen';
import { useZooStore } from './stores/zooStore';
import { useSettingsStore } from './stores/settingsStore';
import { setVolumes, startMusic, stopMusic, unlockAudio } from './audio/sound';

type Screen = 'calibration' | 'how-to-play' | 'main-menu' | 'settings' | 'zoo';

const CALIBRATED_KEY = 'zoo-architect-calibrated-v1';

export default function App() {
  // Instructions open on every load, not just the first: calibration is
  // remembered per device, so a new player on a shared TV would otherwise
  // land on the menu without ever seeing how to play.
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(CALIBRATED_KEY) ? 'how-to-play' : 'calibration'));
  // The platform's Back button: one screen back, and out of the game from the first screens.
  useEffect(() => {
    (window as unknown as { __kfBack?: () => boolean }).__kfBack = () => {
      if (screen === 'calibration' || screen === 'how-to-play' || screen === 'main-menu') return false;
      setScreen('main-menu');
      return true;
    };
  }, [screen]);


  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const totalTicketsEarned = useZooStore((s) => s.totalTicketsEarned);

  useEffect(() => { setVolumes(musicVolume, sfxVolume); }, [musicVolume, sfxVolume]);

  useEffect(() => {
    if (screen !== 'calibration') startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [screen]);

  function exitToPlatform() {
    stopMusic();
    const score = Math.round(totalTicketsEarned);
    // Nothing scored this visit: leave without saving a zero score.
    window.parent?.postMessage(score > 0 ? { type: 'GAME_COMPLETE', score } : { type: 'GAME_EXIT' }, '*');
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
    setScreen('zoo');
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

      {screen === 'zoo' && <ZooScreen onExit={() => setScreen('main-menu')} />}
    </GestureProvider>
  );
}
