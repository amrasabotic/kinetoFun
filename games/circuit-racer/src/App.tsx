import { useEffect, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import GestureCursorDot from './components/common/GestureCursorDot';
import HandLostOverlay from './components/common/HandLostOverlay';
import CalibrationScreen from './components/menu/CalibrationScreen';
import MainMenu from './components/menu/MainMenu';
import SettingsScreen from './components/menu/SettingsScreen';
import CourseSelect from './components/menu/CourseSelect';
import RaceScreen from './components/game/RaceScreen';
import { useRaceStore } from './stores/raceStore';
import { useSettingsStore } from './stores/settingsStore';
import { setVolumes, startMusic, stopMusic, unlockAudio } from './audio/sound';

type Screen = 'calibration' | 'main-menu' | 'settings' | 'course-select' | 'race';

const CALIBRATED_KEY = 'circuit-racer-calibrated-v1';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    localStorage.getItem(CALIBRATED_KEY) ? 'main-menu' : 'calibration'
  );
  const [selectedCourse, setSelectedCourse] = useState<string>('c1');

  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const totalCoinsEarned = useRaceStore((s) => s.totalCoinsEarned);

  useEffect(() => { setVolumes(musicVolume, sfxVolume); }, [musicVolume, sfxVolume]);

  useEffect(() => {
    if (screen !== 'calibration') startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [screen]);

  function exitToPlatform() {
    stopMusic();
    window.parent?.postMessage({ type: 'GAME_COMPLETE', score: Math.round(totalCoinsEarned) }, '*');
  }

  function handleCalibrationDone() {
    unlockAudio();
    localStorage.setItem(CALIBRATED_KEY, '1');
    setScreen('main-menu');
  }

  function handleMainMenuSelect(action: string) {
    unlockAudio();
    if (action === 'exit') { exitToPlatform(); return; }
    if (action === 'settings') { setScreen('settings'); return; }
    if (action === 'race') { setScreen('course-select'); return; }
  }

  function handleCourseSelect(courseId: string) {
    unlockAudio();
    setSelectedCourse(courseId);
    setScreen('race');
  }

  function handleRaceComplete() {
    setScreen('main-menu');
  }

  return (
    <GestureProvider>
      {screen !== 'calibration' && <GestureCursorDot />}
      {screen !== 'calibration' && <HandLostOverlay />}

      {screen === 'calibration' && <CalibrationScreen onDone={handleCalibrationDone} />}
      {screen === 'main-menu' && <MainMenu onSelect={handleMainMenuSelect} />}
      {screen === 'settings' && <SettingsScreen onBack={() => setScreen('main-menu')} />}
      {screen === 'course-select' && <CourseSelect onSelect={handleCourseSelect} onBack={() => setScreen('main-menu')} />}
      {screen === 'race' && <RaceScreen courseId={selectedCourse} onExit={handleRaceComplete} />}
    </GestureProvider>
  );
}
