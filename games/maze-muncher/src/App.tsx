import { useCallback, useRef, useState } from 'react';
import { useMediaPipe } from './hooks/useMediaPipe';
import CameraFeed from './components/CameraFeed';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import HowToPlayScreen from './components/HowToPlayScreen';
import SettingsScreen from './components/SettingsScreen';
import HighScoresScreen from './components/HighScoresScreen';
import CountdownOverlay from './components/CountdownOverlay';
import PauseScreen from './components/PauseScreen';
import LevelCompleteScreen from './components/LevelCompleteScreen';
import GameOverScreen from './components/GameOverScreen';
import type { Screen, Settings } from './types/GameTypes';
import { loadSave, persistSave, recordHighScore, topScore, DEFAULT_SETTINGS } from './utils/storage';
import * as audio from './game/audio';

const GAMEPLAY_SCREENS: Screen[] = ['countdown', 'playing', 'paused', 'levelcomplete', 'gameover'];

function postGameComplete(score: number): void {
  try {
    window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*');
  } catch {
    /* not embedded in an iframe — ignore */
  }
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { handRef, status } = useMediaPipe(videoRef as React.RefObject<HTMLVideoElement>);

  const [screen, setScreen] = useState<Screen>('menu');
  const [save, setSave] = useState(() => loadSave());
  const [level, setLevel] = useState(1);
  const [keepScore, setKeepScore] = useState(false);
  const [runId, setRunId] = useState(0);
  const [pending, setPending] = useState<{ score: number; level: number }>({ score: 0, level: 1 });
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  const beginRun = useCallback((newLevel: number, keep: boolean) => {
    setLevel(newLevel);
    setKeepScore(keep);
    setRunId((id) => id + 1);
    setScreen('countdown');
  }, []);

  const handleStart = useCallback(() => {
    audio.initAudio();
    audio.startAmbient();
    beginRun(1, false);
  }, [beginRun]);

  const handleCountdownDone = useCallback(() => setScreen('playing'), []);
  const handlePauseRequested = useCallback(() => setScreen((s) => (s === 'playing' ? 'paused' : s)), []);
  const handleResume = useCallback(() => setScreen('playing'), []);
  const handleQuitToMenu = useCallback(() => setScreen('menu'), []);

  const handleGameOver = useCallback(
    (score: number, lvl: number) => {
      setSave((prev) => {
        const wasHigh = score > topScore(prev);
        setIsNewHighScore(wasHigh);
        return recordHighScore(prev, score, lvl);
      });
      setPending({ score, level: lvl });
      setScreen('gameover');
      postGameComplete(score);
    },
    [],
  );

  const handleLevelComplete = useCallback((score: number, lvl: number) => {
    setPending({ score, level: lvl });
    setScreen('levelcomplete');
  }, []);

  const handleContinueNextLevel = useCallback(() => beginRun(pending.level + 1, true), [beginRun, pending.level]);
  const handleRestart = useCallback(() => beginRun(1, false), [beginRun]);

  const handleChangeSettings = useCallback((patch: Partial<Settings>) => {
    setSave((prev) => {
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      persistSave(next);
      audio.setMuted(!next.settings.sound);
      audio.setMusicVolume(next.settings.musicVolume);
      audio.setSfxVolume(next.settings.sfxVolume);
      return next;
    });
  }, []);

  const handleCalibrate = useCallback(() => {
    setCalibrating(true);
    setTimeout(() => {
      const hand = handRef.current;
      setSave((prev) => {
        const next = { ...prev, lastCalibration: hand?.detected ? { x: hand.x, y: hand.y } : prev.lastCalibration };
        persistSave(next);
        return next;
      });
      setCalibrating(false);
    }, 2000);
  }, [handRef]);

  const handleResetProgress = useCallback(() => {
    const fresh = { settings: DEFAULT_SETTINGS, highScores: [], lastCalibration: null };
    persistSave(fresh);
    setSave(fresh);
  }, []);

  const handleQuit = useCallback(() => {
    try {
      window.parent?.postMessage({ type: 'GAME_QUIT' }, '*');
    } catch {
      /* ignore */
    }
  }, []);

  const showGameplay = GAMEPLAY_SCREENS.includes(screen);
  const highScore = topScore(save);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#04060f]">
      <video ref={videoRef as React.RefObject<HTMLVideoElement>} className="absolute opacity-0 pointer-events-none w-1 h-1" muted playsInline />

      {showGameplay && (
        <GameCanvas
          handRef={handRef}
          settings={save.settings}
          calibration={save.lastCalibration}
          active={screen === 'playing'}
          level={level}
          keepScore={keepScore}
          runId={runId}
          highScore={highScore}
          onPauseRequested={handlePauseRequested}
          onGameOver={handleGameOver}
          onLevelComplete={handleLevelComplete}
        />
      )}

      {screen === 'menu' && (
        <MainMenu
          handRef={handRef}
          highScore={highScore}
          onStart={handleStart}
          onHowToPlay={() => setScreen('howtoplay')}
          onSettings={() => setScreen('settings')}
          onHighScores={() => setScreen('highscores')}
          onQuit={handleQuit}
        />
      )}

      {screen === 'howtoplay' && <HowToPlayScreen handRef={handRef} onBack={() => setScreen('menu')} />}

      {screen === 'settings' && (
        <SettingsScreen
          handRef={handRef}
          settings={save.settings}
          onChange={handleChangeSettings}
          onCalibrate={handleCalibrate}
          onBack={() => setScreen('menu')}
          onResetProgress={handleResetProgress}
        />
      )}

      {screen === 'highscores' && <HighScoresScreen handRef={handRef} save={save} onBack={() => setScreen('menu')} />}

      {screen === 'countdown' && <CountdownOverlay label={keepScore ? `Level ${level}` : undefined} onDone={handleCountdownDone} />}

      {screen === 'paused' && <PauseScreen handRef={handRef} onResume={handleResume} onRestart={handleRestart} onQuitToMenu={handleQuitToMenu} />}

      {screen === 'levelcomplete' && (
        <LevelCompleteScreen handRef={handRef} score={pending.score} level={pending.level} onContinue={handleContinueNextLevel} />
      )}

      {screen === 'gameover' && (
        <GameOverScreen
          handRef={handRef}
          score={pending.score}
          level={pending.level}
          isNewHighScore={isNewHighScore}
          onRestart={handleRestart}
          onMenu={handleQuitToMenu}
        />
      )}

      {calibrating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="text-2xl font-bold text-cyan-300 animate-pulse-glow">Hold your hand naturally… calibrating</div>
        </div>
      )}

      <CameraFeed videoRef={videoRef as React.RefObject<HTMLVideoElement>} handRef={handRef} status={status} />
    </div>
  );
}
