import { useEffect, useRef, useState } from 'react';
import { GestureProvider } from './mediaPipe/GestureProvider';
import GestureCursorDot from './components/common/GestureCursorDot';
import HandLostOverlay from './components/common/HandLostOverlay';
import CalibrationScreen from './components/menu/CalibrationScreen';
import MainMenu, { type MainMenuAction } from './components/menu/MainMenu';
import WorldTourMap from './components/menu/WorldTourMap';
import CountrySelect from './components/menu/CountrySelect';
import PracticeSelect from './components/menu/PracticeSelect';
import GalleryScreen from './components/menu/GalleryScreen';
import SettingsScreen from './components/menu/SettingsScreen';
import GameplayScreen from './components/game/GameplayScreen';
import EndScreen from './components/game/EndScreen';
import { ALL_FLAGS, CONTINENT_ORDER, getFlagById, getFlagsByContinent, pickEndlessFlag } from './flags';
import { useProgressStore } from './stores/progressStore';
import { useSettingsStore } from './stores/settingsStore';
import type { Continent, GameMode, LevelResult } from './types';
import { setVolumes, startMusic, stopMusic, unlockAudio } from './audio/sound';

type Screen =
  | 'calibration' | 'main-menu' | 'world-tour-map' | 'country-select'
  | 'practice-select' | 'gallery' | 'settings' | 'gameplay' | 'end-screen';

const CALIBRATED_KEY = 'flag-quest-calibrated-v1';

function nextWorldTourFlagId(currentFlagId: string, isUnlocked: (id: string) => boolean): string | null {
  const flag = getFlagById(currentFlagId);
  if (!flag) return null;
  const continentFlags = getFlagsByContinent(flag.continent);
  const idx = continentFlags.findIndex((f) => f.id === currentFlagId);
  if (idx >= 0 && idx + 1 < continentFlags.length) {
    const candidate = continentFlags[idx + 1];
    if (isUnlocked(candidate.id)) return candidate.id;
  }
  const cIdx = CONTINENT_ORDER.indexOf(flag.continent);
  for (let i = cIdx + 1; i < CONTINENT_ORDER.length; i++) {
    const first = getFlagsByContinent(CONTINENT_ORDER[i])[0];
    if (first && isUnlocked(first.id)) return first.id;
  }
  return null;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem(CALIBRATED_KEY) ? 'main-menu' : 'calibration'));
  const [mode, setMode] = useState<GameMode>('world-tour');
  const [continent, setContinent] = useState<Continent | null>(null);
  const [activeFlagId, setActiveFlagId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LevelResult | null>(null);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [runId, setRunId] = useState(0);
  const endlessRoundRef = useRef(0);
  const sessionScoreRef = useRef(0);

  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const recordLevelResult = useProgressStore((s) => s.recordLevelResult);
  const recordEndlessScore = useProgressStore((s) => s.recordEndlessScore);
  const isCountryUnlocked = useProgressStore((s) => s.isCountryUnlocked);
  const starsByFlag = useProgressStore((s) => s.starsByFlag);
  const unlockedCountryIds = useProgressStore((s) => s.unlockedCountryIds);

  useEffect(() => { setVolumes(musicVolume, sfxVolume); }, [musicVolume, sfxVolume]);

  useEffect(() => {
    if (screen === 'main-menu' || screen === 'world-tour-map' || screen === 'country-select' || screen === 'practice-select' || screen === 'gallery' || screen === 'settings') {
      startMusic();
    } else {
      stopMusic();
    }
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
    if (action === 'play') {
      const nextId = unlockedCountryIds.find((id) => (starsByFlag[id] ?? 0) < 3) ?? unlockedCountryIds[0] ?? ALL_FLAGS[0].id;
      setMode('world-tour');
      setActiveFlagId(nextId);
      setRunId((n) => n + 1);
      setScreen('gameplay');
    } else if (action === 'practice') {
      setMode('practice');
      setScreen('practice-select');
    } else if (action === 'world-tour') {
      setMode('world-tour');
      setScreen('world-tour-map');
    } else if (action === 'endless') {
      setMode('endless');
      endlessRoundRef.current = 0;
      setActiveFlagId(pickEndlessFlag(0).id);
      setRunId((n) => n + 1);
      setScreen('gameplay');
    } else if (action === 'gallery') {
      setScreen('gallery');
    } else if (action === 'settings') {
      setScreen('settings');
    }
  }

  function startFlag(flagId: string, m: GameMode) {
    setMode(m);
    setActiveFlagId(flagId);
    setRunId((n) => n + 1);
    setScreen('gameplay');
  }

  function handleLevelComplete(result: LevelResult) {
    if (mode !== 'practice') {
      const unlocked = recordLevelResult(result);
      setNewAchievements(unlocked);
      sessionScoreRef.current += result.score;
      if (mode === 'endless') {
        recordEndlessScore(sessionScoreRef.current);
      }
    } else {
      setNewAchievements([]);
    }
    setLastResult(result);
    setScreen('end-screen');
  }

  function handleGameplayExit() {
    if (mode === 'practice') setScreen('practice-select');
    else if (mode === 'world-tour') setScreen(continent ? 'country-select' : 'world-tour-map');
    else setScreen('main-menu');
  }

  function handleEndNext() {
    if (!activeFlagId) { setScreen('main-menu'); return; }
    if (mode === 'practice') { setScreen('practice-select'); return; }
    if (mode === 'endless') {
      endlessRoundRef.current += 1;
      const next = pickEndlessFlag(endlessRoundRef.current, activeFlagId);
      startFlag(next.id, 'endless');
      return;
    }
    const nextId = nextWorldTourFlagId(activeFlagId, isCountryUnlocked);
    if (nextId) startFlag(nextId, 'world-tour');
    else setScreen('world-tour-map');
  }

  function handleEndReplay() {
    setRunId((n) => n + 1);
    setScreen('gameplay');
  }

  function handleEndMainMenu() {
    setScreen('main-menu');
  }

  const activeFlag = activeFlagId ? getFlagById(activeFlagId) : null;

  return (
    <GestureProvider>
      {screen !== 'calibration' && <GestureCursorDot />}
      {screen !== 'calibration' && <HandLostOverlay />}

      {screen === 'calibration' && <CalibrationScreen onDone={handleCalibrationDone} />}

      {screen === 'main-menu' && <MainMenu onSelect={handleMainMenuSelect} />}

      {screen === 'world-tour-map' && (
        <WorldTourMap
          onSelect={(c) => { setContinent(c); setScreen('country-select'); }}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'country-select' && continent && (
        <CountrySelect
          continent={continent}
          onSelect={(id) => startFlag(id, 'world-tour')}
          onBack={() => setScreen('world-tour-map')}
        />
      )}

      {screen === 'practice-select' && (
        <PracticeSelect
          onSelect={(id) => startFlag(id, 'practice')}
          onBack={() => setScreen('main-menu')}
        />
      )}

      {screen === 'gallery' && <GalleryScreen onBack={() => setScreen('main-menu')} />}

      {screen === 'settings' && <SettingsScreen onBack={() => setScreen('main-menu')} />}

      {screen === 'gameplay' && activeFlag && (
        <GameplayScreen
          key={`${activeFlag.id}-${runId}`}
          flag={activeFlag}
          mode={mode}
          onExit={handleGameplayExit}
          onLevelComplete={handleLevelComplete}
        />
      )}

      {screen === 'end-screen' && activeFlag && lastResult && (
        <EndScreen
          flag={activeFlag}
          result={lastResult}
          newAchievements={newAchievements}
          hasNext={mode !== 'practice'}
          onNext={handleEndNext}
          onReplay={handleEndReplay}
          onMainMenu={handleEndMainMenu}
        />
      )}
    </GestureProvider>
  );
}
