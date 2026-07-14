import { useCallback, useEffect, useRef, useState } from 'react';
import { Lane } from './components/Lane';
import { SwingMeter } from './components/SwingMeter';
import { Scoreboard } from './components/Scoreboard';
import { UIOverlay } from './components/UIOverlay';
import { useGesture, useGestureRef } from './hooks/useGesture';
import { useDwellButton } from './hooks/useDwellButton';
import { useGame } from './hooks/useGame';
import { useSwing } from './hooks/useSwing';
import type { Difficulty, GameMode, RollOutcome } from './types';
import { sfx } from './systems/audio';
import { recordGame, hasDailyCompletedToday } from './systems/save';
import { useGestureContext } from './mediaPipe/GestureProvider';

function MenuButton({ label, onActivate, active }: { label: string; onActivate: () => void; active?: boolean }) {
  const { elRef, progress } = useDwellButton(600, onActivate);
  return (
    <div ref={elRef} className={`gbl-menu-btn ${active ? 'gbl-menu-btn--active' : ''}`}>
      <div className="gbl-menu-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

function MenuScreen({
  onStart,
  gestureCursor,
}: {
  onStart: (mode: GameMode, difficulty: Difficulty) => void;
  gestureCursor: { x: number; y: number } | null;
}) {
  const [mode, setMode] = useState<GameMode>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const dailyDone = hasDailyCompletedToday();

  return (
    <div className="gbl-menu">
      <h1 className="gbl-menu__title">Gesture Bowling Lane</h1>
      <p className="gbl-menu__subtitle">
        Move your hand to aim, raise it to wind up, swing down through the release line to roll.
      </p>

      <div className="gbl-menu__section">
        <h3>Mode</h3>
        <div className="gbl-menu__row">
          {(['classic', 'timed', 'zen', 'daily'] as GameMode[]).map((m) => (
            <MenuButton key={m} label={m === 'daily' && dailyDone ? 'Daily ✓' : m} active={mode === m} onActivate={() => setMode(m)} />
          ))}
        </div>
      </div>

      <div className="gbl-menu__section">
        <h3>Difficulty</h3>
        <div className="gbl-menu__row">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <MenuButton key={d} label={d} active={difficulty === d} onActivate={() => setDifficulty(d)} />
          ))}
        </div>
      </div>

      <div className="gbl-menu__section">
        <MenuButton label="Start Game" onActivate={() => onStart(mode, difficulty)} />
      </div>

      {gestureCursor && (
        <div className="gbl-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
      )}
    </div>
  );
}

const TIMED_LIMIT_SECONDS = 300;

function GameScreen({ mode, difficulty, onExit }: { mode: GameMode; difficulty: Difficulty; onExit: () => void }) {
  const { config, laneBias, frames, frameIndex, standingPinIds, score, strikes, gameOver, recordRoll, reset } = useGame(
    mode,
    difficulty,
  );
  const gesture = useGesture();
  const gestureRef = useGestureRef();
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [resultFlash, setResultFlash] = useState<string | null>(null);
  const twoHandsCooldownRef = useRef(false);
  const standingBeforeRollRef = useRef(standingPinIds);
  standingBeforeRollRef.current = standingPinIds;

  const onResolved = useCallback(
    (outcome: RollOutcome) => {
      const pinfall = outcome.isGutter ? 0 : outcome.knockedPinIds.length;
      const wasFullRack = standingBeforeRollRef.current.length === 10;

      if (outcome.isGutter || pinfall === 0) {
        sfx.gutter();
        setResultFlash('Gutter');
      } else if (pinfall === 10) {
        sfx.strike();
        setResultFlash('Strike!');
      } else if (pinfall === standingBeforeRollRef.current.length && !wasFullRack) {
        sfx.spare();
        setResultFlash('Spare!');
      } else {
        sfx.pinCrash(pinfall);
        setResultFlash(`${pinfall} pin${pinfall === 1 ? '' : 's'}`);
      }
      window.setTimeout(() => setResultFlash(null), 1100);
      recordRoll(outcome);
    },
    [recordRoll],
  );

  const { swing, resetSwing } = useSwing({ config, standingPinIds, laneBias, onResolved });

  const restartGame = useCallback(() => {
    reset();
    resetSwing();
    setElapsedSeconds(0);
    setFinished(false);
  }, [reset, resetSwing]);

  // Restart the game from anywhere via two-hands-raised, matching the platform's gesture convention.
  useEffect(() => {
    const id = setInterval(() => {
      if (gestureRef.current.isTwoHandsRaised && !twoHandsCooldownRef.current) {
        twoHandsCooldownRef.current = true;
        restartGame();
      } else if (!gestureRef.current.isTwoHandsRaised) {
        twoHandsCooldownRef.current = false;
      }
    }, 100);
    return () => clearInterval(id);
  }, [gestureRef, restartGame]);

  useEffect(() => {
    if (paused || finished) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, finished]);

  useEffect(() => {
    if (gameOver && !finished) {
      setFinished(true);
      sfx.gameOver();
      recordGame(mode, difficulty, score, strikes);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*');
    }
  }, [gameOver, finished, mode, difficulty, score, strikes]);

  useEffect(() => {
    if (mode === 'timed' && elapsedSeconds >= TIMED_LIMIT_SECONDS && !finished) {
      setFinished(true);
      recordGame(mode, difficulty, score, strikes);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*');
    }
  }, [mode, elapsedSeconds, finished, difficulty, score, strikes]);

  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;
  const trackingLabel = gesture.isHovering ? 'Hand tracked' : 'Raise your hand';

  return (
    <div className="gbl-game-screen">
      <UIOverlay
        mode={mode}
        difficulty={difficulty}
        score={score}
        elapsedSeconds={mode === 'timed' ? Math.max(0, TIMED_LIMIT_SECONDS - elapsedSeconds) : elapsedSeconds}
        onPauseToggle={() => setPaused((p) => !p)}
        onRestart={restartGame}
        onExit={onExit}
        paused={paused}
        gestureCursor={cursorNorm}
        trackingLabel={trackingLabel}
      />

      <Scoreboard frames={frames} currentFrameIndex={frameIndex} />

      <div className="gbl-board">
        <Lane swing={swing} standingPinIds={standingPinIds} />
        <SwingMeter power={swing.power} state={swing.state} />
      </div>

      {resultFlash && <div className="gbl-result-flash">{resultFlash}</div>}

      {paused && (
        <div className="gbl-pause-overlay">
          <h2>Paused</h2>
          <p>Hover Resume to continue.</p>
        </div>
      )}

      {finished && (
        <div className="gbl-victory-overlay">
          <h2>Game Over</h2>
          <p>Final score: {score}</p>
          <p>{strikes} strike{strikes === 1 ? '' : 's'}</p>
          <div className="gbl-menu__row">
            <MenuButton label="Play Again" onActivate={restartGame} />
            <MenuButton label="Menu" onActivate={onExit} />
          </div>
        </div>
      )}
    </div>
  );
}

function CameraGate({ children }: { children: React.ReactNode }) {
  const { status } = useGestureContext();
  if (status === 'no-camera' || status === 'error') {
    return (
      <div className="gbl-camera-gate">
        <h2>Camera unavailable</h2>
        <p>Gesture Bowling Lane needs webcam access for hand-gesture controls. Please allow camera access and reload.</p>
      </div>
    );
  }
  if (status === 'initializing') {
    return (
      <div className="gbl-camera-gate">
        <h2>Starting hand tracking…</h2>
        <p>Show your hand to the camera.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const [screen, setScreen] = useState<{ mode: GameMode; difficulty: Difficulty } | null>(null);
  const gesture = useGesture();
  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;

  return (
    <div className="gbl-app">
      <CameraGate>
        {screen ? (
          <GameScreen mode={screen.mode} difficulty={screen.difficulty} onExit={() => setScreen(null)} />
        ) : (
          <MenuScreen onStart={(mode, difficulty) => setScreen({ mode, difficulty })} gestureCursor={cursorNorm} />
        )}
      </CameraGate>
    </div>
  );
}
