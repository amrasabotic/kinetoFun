import { useCallback, useEffect, useRef, useState } from 'react';
import { Range } from './components/Range';
import { PowerMeter } from './components/PowerMeter';
import { UIOverlay } from './components/UIOverlay';
import { useGesture, useGestureRef } from './hooks/useGesture';
import { useDwellButton } from './hooks/useDwellButton';
import { useRound } from './hooks/useRound';
import { useShot } from './hooks/useShot';
import type { Difficulty, GameMode } from './types';
import { RESULT_LABEL } from './systems/physics';
import { sfx } from './systems/audio';
import { recordRound, hasDailyCompletedToday } from './systems/save';
import { useGestureContext } from './mediaPipe/GestureProvider';

function MenuButton({ label, onActivate, active }: { label: string; onActivate: () => void; active?: boolean }) {
  const { elRef, progress } = useDwellButton(600, onActivate);
  return (
    <div ref={elRef} className={`gar-menu-btn ${active ? 'gar-menu-btn--active' : ''}`}>
      <div className="gar-menu-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

const HOW_TO_PLAY: { icon: string; title: string; text: string }[] = [
  { icon: '☝️', title: 'Aim', text: 'Point your index finger at the screen. The sight follows your fingertip.' },
  { icon: '✊', title: 'Draw the bow', text: 'Make a fist to pull back. The power meter fills while you hold it.' },
  { icon: '🖐️', title: 'Release', text: 'Open your hand to shoot. Too little or too much power misses high or short.' },
  { icon: '🎯', title: 'Score', text: 'Bullseye 10, inner ring 8, middle 5, outer 2. You get 8 arrows per round.' },
  { icon: '🌬️', title: 'Wind', text: 'On medium and hard, wind pushes the arrow sideways — aim to compensate.' },
  { icon: '👉', title: 'Menus', text: 'Point at a button and hold your hand still until it fills to press it.' },
];

// Shown first every time the game loads, and reopened from the menu.
function HowToPlayScreen({ onDone, gestureCursor }: { onDone: () => void; gestureCursor: { x: number; y: number } | null }) {
  return (
    <div className="gar-menu">
      <h1 className="gar-menu__title">How to Play</h1>
      <div className="gar-howto">
        {HOW_TO_PLAY.map((s) => (
          <div key={s.title} className="gar-howto__card">
            <div className="gar-howto__icon">{s.icon}</div>
            <div>
              <div className="gar-howto__title">{s.title}</div>
              <div className="gar-howto__text">{s.text}</div>
            </div>
          </div>
        ))}
      </div>
      <MenuButton label="Let's Play" onActivate={onDone} />
      {gestureCursor && (
        <div className="gar-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
      )}
    </div>
  );
}

function MenuScreen({
  onStart,
  onHowTo,
  gestureCursor,
}: {
  onStart: (mode: GameMode, difficulty: Difficulty) => void;
  onHowTo: () => void;
  gestureCursor: { x: number; y: number } | null;
}) {
  const [mode, setMode] = useState<GameMode>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const dailyDone = hasDailyCompletedToday();

  return (
    <div className="gar-menu">
      <h1 className="gar-menu__title">Gesture Archery Range</h1>
      <p className="gar-menu__subtitle">
        Point your index finger to aim, make a fist to draw, open your hand to release.
      </p>

      <div className="gar-menu__section">
        <h3>Mode</h3>
        <div className="gar-menu__row">
          {(['classic', 'timed', 'zen', 'daily'] as GameMode[]).map((m) => (
            <MenuButton key={m} label={m === 'daily' && dailyDone ? 'Daily ✓' : m} active={mode === m} onActivate={() => setMode(m)} />
          ))}
        </div>
      </div>

      <div className="gar-menu__section">
        <h3>Difficulty</h3>
        <div className="gar-menu__row">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <MenuButton key={d} label={d} active={difficulty === d} onActivate={() => setDifficulty(d)} />
          ))}
        </div>
      </div>

      <div className="gar-menu__section">
        <div className="gar-menu__row">
          <MenuButton label="Start Round" onActivate={() => onStart(mode, difficulty)} />
          <MenuButton label="How to Play" onActivate={onHowTo} />
        </div>
      </div>

      {gestureCursor && (
        <div className="gar-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
      )}
    </div>
  );
}

const TIMED_LIMIT_SECONDS = 90;

function GameScreen({ mode, difficulty, onExit }: { mode: GameMode; difficulty: Difficulty; onExit: () => void }) {
  const { config, recordShot, reset, score, bullseyes, arrowsLeft, roundOver, nextWindSeed } = useRound(mode, difficulty);
  const gesture = useGesture();
  const gestureRef = useGestureRef();
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [stuckArrows, setStuckArrows] = useState<{ x: number; y: number }[]>([]);
  const [resultFlash, setResultFlash] = useState<string | null>(null);
  const twoHandsCooldownRef = useRef(false);

  const onResolved = useCallback(
    (outcome: { result: Parameters<typeof recordShot>[0]['result']; points: number }) => {
      recordShot(outcome);
      setResultFlash(RESULT_LABEL[outcome.result]);
      if (outcome.result === 'bullseye') sfx.bullseye();
      else if (outcome.result === 'miss' || outcome.result === 'short') sfx.miss();
      else sfx.hitThud();
      window.setTimeout(() => setResultFlash(null), 1100);
    },
    [recordShot],
  );

  const { shot } = useShot({ config, nextWindSeed, onResolved });

  useEffect(() => {
    if (shot.state === 'RESOLVED' && shot.impact) {
      setStuckArrows((prev) => [...prev, shot.impact!]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot.state]);

  const restartRound = useCallback(() => {
    reset();
    setStuckArrows([]);
    setElapsedSeconds(0);
    setFinished(false);
  }, [reset]);

  // Restart the round from anywhere via two-hands-raised, matching the platform's gesture convention.
  useEffect(() => {
    const id = setInterval(() => {
      if (gestureRef.current.isTwoHandsRaised && !twoHandsCooldownRef.current) {
        twoHandsCooldownRef.current = true;
        restartRound();
      } else if (!gestureRef.current.isTwoHandsRaised) {
        twoHandsCooldownRef.current = false;
      }
    }, 100);
    return () => clearInterval(id);
  }, [gestureRef, restartRound]);

  useEffect(() => {
    if (paused || finished) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, finished]);

  useEffect(() => {
    if (roundOver && !finished) {
      setFinished(true);
      sfx.victory();
      recordRound(mode, difficulty, score, bullseyes);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*');
    }
  }, [roundOver, finished, mode, difficulty, score, bullseyes]);

  useEffect(() => {
    if (mode === 'timed' && elapsedSeconds >= TIMED_LIMIT_SECONDS && !finished) {
      setFinished(true);
      recordRound(mode, difficulty, score, bullseyes);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*');
    }
  }, [mode, elapsedSeconds, finished, difficulty, score, bullseyes]);

  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;
  const trackingLabel = gesture.isHovering ? 'Hand tracked' : 'Raise your hand';

  return (
    <div className="gar-game-screen">
      <UIOverlay
        mode={mode}
        difficulty={difficulty}
        score={score}
        arrowsLeft={arrowsLeft}
        config={config}
        elapsedSeconds={mode === 'timed' ? Math.max(0, TIMED_LIMIT_SECONDS - elapsedSeconds) : elapsedSeconds}
        onPauseToggle={() => setPaused((p) => !p)}
        onRestart={restartRound}
        onExit={onExit}
        paused={paused}
        gestureCursor={cursorNorm}
        trackingLabel={trackingLabel}
      />

      <div className="gar-board">
        <Range config={config} shot={shot} stuckArrows={stuckArrows} />
        <PowerMeter power={shot.power} state={shot.state} config={config} />
      </div>

      {resultFlash && <div className="gar-result-flash">{resultFlash}</div>}

      {paused && (
        <div className="gar-pause-overlay">
          <h2>Paused</h2>
          <p>Hover Resume to continue.</p>
        </div>
      )}

      {finished && (
        <div className="gar-victory-overlay">
          <h2>Round Complete</h2>
          <p>Final score: {score}</p>
          <p>{bullseyes} bullseye{bullseyes === 1 ? '' : 's'}</p>
          <div className="gar-menu__row">
            <MenuButton label="Play Again" onActivate={restartRound} />
            <MenuButton label="Menu" onActivate={onExit} />
          </div>
        </div>
      )}
    </div>
  );
}

// allowWhileStarting lets How to Play show straight away while the camera starts;
// everything else waits for hand tracking.
function CameraGate({ children, allowWhileStarting = false }: { children: React.ReactNode; allowWhileStarting?: boolean }) {
  const { status } = useGestureContext();
  if (status === 'no-camera' || status === 'error') {
    return (
      <div className="gar-camera-gate">
        <h2>Camera unavailable</h2>
        <p>Gesture Archery Range needs webcam access for hand-gesture controls. Please allow camera access and reload.</p>
      </div>
    );
  }
  if (status === 'initializing' && !allowWhileStarting) {
    return (
      <div className="gar-camera-gate">
        <h2>Starting hand tracking…</h2>
        <p>Show your hand to the camera.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const [screen, setScreen] = useState<{ mode: GameMode; difficulty: Difficulty } | null>(null);
  // How to Play is the first screen every time the game loads.
  const [showHowTo, setShowHowTo] = useState(true);
  const gesture = useGesture();
  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;

  return (
    <div className="gar-app">
      <CameraGate allowWhileStarting={!screen && showHowTo}>
        {screen ? (
          <GameScreen mode={screen.mode} difficulty={screen.difficulty} onExit={() => setScreen(null)} />
        ) : showHowTo ? (
          <HowToPlayScreen onDone={() => setShowHowTo(false)} gestureCursor={cursorNorm} />
        ) : (
          <MenuScreen
            onStart={(mode, difficulty) => setScreen({ mode, difficulty })}
            onHowTo={() => setShowHowTo(true)}
            gestureCursor={cursorNorm}
          />
        )}
      </CameraGate>
    </div>
  );
}
