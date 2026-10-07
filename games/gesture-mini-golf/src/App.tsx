import { useCallback, useEffect, useRef, useState } from 'react';
import { Course } from './components/Course';
import { SwingMeter } from './components/SwingMeter';
import { Scoreboard } from './components/Scoreboard';
import { UIOverlay } from './components/UIOverlay';
import { useGesture, useGestureRef } from './hooks/useGesture';
import { useDwellButton } from './hooks/useDwellButton';
import { useGame } from './hooks/useGame';
import { useSwing } from './hooks/useSwing';
import type { Difficulty, GameMode, StrokeOutcome } from './types';
import { relativeToParLabel } from './systems/scoringEngine';
import { sfx } from './systems/audio';
import { recordRound, hasDailyCompletedToday } from './systems/save';
import { useGestureContext } from './mediaPipe/GestureProvider';

function MenuButton({ label, onActivate, active }: { label: string; onActivate: () => void; active?: boolean }) {
  const { elRef, progress } = useDwellButton(600, onActivate);
  return (
    <div ref={elRef} className={`gmg-menu-btn ${active ? 'gmg-menu-btn--active' : ''}`}>
      <div className="gmg-menu-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

const HOW_TO_PLAY: { icon: string; title: string; text: string }[] = [
  { icon: '☝️', title: 'Aim', text: 'Point your index finger where you want the ball to go. A line shows the aim.' },
  { icon: '✊', title: 'Charge', text: 'Make a fist to charge the putt. The longer you hold it, the harder the shot.' },
  { icon: '🖐️', title: 'Putt', text: 'Open your hand to release the fist and hit the ball.' },
  { icon: '⛳', title: 'Score', text: 'Sink each hole in as few strokes as you can. Par is shown for every hole.' },
  { icon: '💧', title: 'Hazards', text: 'Sand slows the ball. Water costs a penalty stroke and sends you back to the tee.' },
  { icon: '👉', title: 'Menus', text: 'Point at a button and hold your hand still until it fills to press it.' },
];

// Shown first every time the game loads, and reopened from the menu.
function HowToPlayScreen({ onDone, gestureCursor }: { onDone: () => void; gestureCursor: { x: number; y: number } | null }) {
  return (
    <div className="gmg-menu">
      <h1 className="gmg-menu__title">How to Play</h1>
      <p className="gmg-menu__subtitle">Easy plays 4 holes; medium and hard play 6.</p>
      <div className="gmg-howto">
        {HOW_TO_PLAY.map((s) => (
          <div key={s.title} className="gmg-howto__card">
            <div className="gmg-howto__icon">{s.icon}</div>
            <div>
              <div className="gmg-howto__title">{s.title}</div>
              <div className="gmg-howto__text">{s.text}</div>
            </div>
          </div>
        ))}
      </div>
      <MenuButton label="Let's Play" onActivate={onDone} />
      {gestureCursor && (
        <div className="gmg-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
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
    <div className="gmg-menu">
      <h1 className="gmg-menu__title">Gesture Mini-Golf</h1>
      <p className="gmg-menu__subtitle">
        Point where you want to putt, make a fist to charge power, release your fist to shoot the ball.
      </p>

      <div className="gmg-menu__section">
        <h3>Mode</h3>
        <div className="gmg-menu__row">
          {(['classic', 'timed', 'zen', 'daily'] as GameMode[]).map((m) => (
            <MenuButton key={m} label={m === 'daily' && dailyDone ? 'Daily ✓' : m} active={mode === m} onActivate={() => setMode(m)} />
          ))}
        </div>
      </div>

      <div className="gmg-menu__section">
        <h3>Difficulty</h3>
        <div className="gmg-menu__row">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <MenuButton key={d} label={d} active={difficulty === d} onActivate={() => setDifficulty(d)} />
          ))}
        </div>
      </div>

      <div className="gmg-menu__section">
        <div className="gmg-menu__row">
          <MenuButton label="Start Round" onActivate={() => onStart(mode, difficulty)} />
          <MenuButton label="How to Play" onActivate={onHowTo} />
        </div>
      </div>

      {gestureCursor && (
        <div className="gmg-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
      )}
    </div>
  );
}

const TIMED_LIMIT_SECONDS = 240;

function GameScreen({ mode, difficulty, onExit }: { mode: GameMode; difficulty: Difficulty; onExit: () => void }) {
  const {
    holes,
    holeIndex,
    currentHole,
    strokesThisHole,
    results,
    ballStart,
    frictionScale,
    maxPuttSpeedMultiplier,
    courseComplete,
    totalScore,
    leaderboardScore,
    holesInOne,
    recordStroke,
    reset,
  } = useGame(mode, difficulty);

  const gesture = useGesture();
  const gestureRef = useGestureRef();
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const [resultFlash, setResultFlash] = useState<string | null>(null);
  const twoHandsCooldownRef = useRef(false);

  const onResolved = useCallback(
    (outcome: StrokeOutcome) => {
      if (outcome.kind === 'water') {
        setResultFlash('Splash! +1');
      } else if (outcome.kind === 'holed') {
        setResultFlash(relativeToParLabel(strokesThisHole + 1, currentHole.par));
      }
      recordStroke(outcome);
      window.setTimeout(() => setResultFlash(null), 1300);
    },
    [recordStroke, strokesThisHole, currentHole.par],
  );

  const { swing, resetSwing } = useSwing({
    hole: currentHole,
    ballStart,
    frictionScale,
    maxPuttSpeedMultiplier,
    onResolved,
  });

  const restartGame = useCallback(() => {
    reset();
    resetSwing({ x: holes[0].tee.x, y: holes[0].tee.y });
    setElapsedSeconds(0);
    setFinished(false);
  }, [reset, resetSwing, holes]);

  // Restart the round from anywhere via two-hands-raised, matching the platform's gesture convention.
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
    if (courseComplete && !finished) {
      setFinished(true);
      sfx.courseComplete();
      recordRound(mode, difficulty, leaderboardScore, holesInOne);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score: leaderboardScore }, '*');
    }
  }, [courseComplete, finished, mode, difficulty, leaderboardScore, holesInOne]);

  useEffect(() => {
    if (mode === 'timed' && elapsedSeconds >= TIMED_LIMIT_SECONDS && !finished) {
      setFinished(true);
      recordRound(mode, difficulty, leaderboardScore, holesInOne);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score: leaderboardScore }, '*');
    }
  }, [mode, elapsedSeconds, finished, difficulty, leaderboardScore, holesInOne]);

  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;
  const trackingLabel = gesture.isHovering ? 'Hand tracked' : 'Raise your hand';

  return (
    <div className="gmg-game-screen">
      <UIOverlay
        mode={mode}
        difficulty={difficulty}
        totalScore={totalScore}
        elapsedSeconds={mode === 'timed' ? Math.max(0, TIMED_LIMIT_SECONDS - elapsedSeconds) : elapsedSeconds}
        onPauseToggle={() => setPaused((p) => !p)}
        onRestart={restartGame}
        onExit={onExit}
        paused={paused}
        gestureCursor={cursorNorm}
        trackingLabel={trackingLabel}
      />

      <Scoreboard holes={holes} results={results} holeIndex={holeIndex} strokesThisHole={strokesThisHole} />

      <div className="gmg-board">
        <Course hole={currentHole} swing={swing} />
        <SwingMeter power={swing.power} state={swing.state} />
      </div>

      {resultFlash && <div className="gmg-result-flash">{resultFlash}</div>}

      {paused && (
        <div className="gmg-pause-overlay">
          <h2>Paused</h2>
          <p>Hover Resume to continue.</p>
        </div>
      )}

      {finished && (
        <div className="gmg-victory-overlay">
          <h2>Round Complete</h2>
          <p>Total strokes: {totalScore}</p>
          <p>{holesInOne} hole{holesInOne === 1 ? '' : 's'} in one</p>
          <div className="gmg-menu__row">
            <MenuButton label="Play Again" onActivate={restartGame} />
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
      <div className="gmg-camera-gate">
        <h2>Camera unavailable</h2>
        <p>Gesture Mini-Golf needs webcam access for hand-gesture controls. Please allow camera access and reload.</p>
      </div>
    );
  }
  if (status === 'initializing' && !allowWhileStarting) {
    return (
      <div className="gmg-camera-gate">
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
    <div className="gmg-app">
      <CameraGate allowWhileStarting={!screen && showHowTo}>
        {screen ? (
          <GameScreen mode={screen.mode} difficulty={screen.difficulty} onExit={() => setScreen(null)} />
        ) : (
          showHowTo ? (
            <HowToPlayScreen onDone={() => setShowHowTo(false)} gestureCursor={cursorNorm} />
          ) : (
            <MenuScreen
              onStart={(mode, difficulty) => setScreen({ mode, difficulty })}
              onHowTo={() => setShowHowTo(true)}
              gestureCursor={cursorNorm}
            />
          )
        )}
      </CameraGate>
    </div>
  );
}
