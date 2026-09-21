import { useCallback, useEffect, useState } from 'react';
import { Dartboard } from './components/Dartboard';
import { PowerMeter } from './components/PowerMeter';
import { ScoreCard } from './components/ScoreCard';
import { UIOverlay } from './components/UIOverlay';
import { useGesture } from './hooks/useGesture';
import { useDwellButton } from './hooks/useDwellButton';
import { useMatch } from './hooks/useMatch';
import { useThrow } from './hooks/useThrow';
import type { Difficulty, GameMode } from './types';
import { PLAYER_THROW_CONFIG } from './types';
import { RING_LABEL } from './systems/dartboard';
import { recordMatch, hasDailyCompletedToday } from './systems/save';
import { useGestureContext } from './mediaPipe/GestureProvider';

function MenuButton({ label, onActivate, active }: { label: string; onActivate: () => void; active?: boolean }) {
  const { elRef, progress } = useDwellButton(600, onActivate);
  return (
    <div ref={elRef} className={`gdt-menu-btn ${active ? 'gdt-menu-btn--active' : ''}`}>
      <div className="gdt-menu-btn__fill" style={{ width: `${progress * 100}%` }} />
      <span>{label}</span>
    </div>
  );
}

function MenuScreen({
  onStart,
  gestureCursor,
}: {
  onStart: (mode: GameMode, difficulty: Difficulty, daily: boolean) => void;
  gestureCursor: { x: number; y: number } | null;
}) {
  const [mode, setMode] = useState<GameMode>('501');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [daily, setDaily] = useState(false);
  const dailyDone = hasDailyCompletedToday();

  return (
    <div className="gdt-menu">
      <h1 className="gdt-menu__title">Gesture Darts</h1>
      <p className="gdt-menu__subtitle">
        Point your index finger to aim, make a fist to draw back, open your hand to release the dart.
      </p>

      <div className="gdt-menu__section">
        <h3>Mode</h3>
        <div className="gdt-menu__row">
          {(['301', '501', 'cricket'] as GameMode[]).map((m) => (
            <MenuButton key={m} label={m === 'cricket' ? 'Cricket' : m} active={mode === m} onActivate={() => setMode(m)} />
          ))}
        </div>
      </div>

      <div className="gdt-menu__section">
        <h3>Opponent Difficulty</h3>
        <div className="gdt-menu__row">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <MenuButton key={d} label={d} active={difficulty === d} onActivate={() => setDifficulty(d)} />
          ))}
        </div>
      </div>

      <div className="gdt-menu__section">
        <MenuButton
          label={daily ? (dailyDone ? 'Daily ✓' : 'Daily (on)') : 'Daily Challenge'}
          active={daily}
          onActivate={() => setDaily((d) => !d)}
        />
      </div>

      <div className="gdt-menu__section">
        <MenuButton label="Start Match" onActivate={() => onStart(mode, difficulty, daily)} />
      </div>

      {gestureCursor && (
        <div className="gdt-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
      )}
    </div>
  );
}

function GameScreen({
  mode,
  difficulty,
  daily,
  onExit,
}: {
  mode: GameMode;
  difficulty: Difficulty;
  daily: boolean;
  onExit: () => void;
}) {
  const { match, throwDart, reset } = useMatch(mode, difficulty, daily);
  const gesture = useGesture();
  const [paused, setPaused] = useState(false);
  const [resultFlash, setResultFlash] = useState<string | null>(null);
  const [showBust, setShowBust] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const onResolved = useCallback(
    (outcome: Parameters<typeof throwDart>[1]) => {
      setResultFlash(RING_LABEL[outcome.ring]);
      window.setTimeout(() => setResultFlash(null), 1000);
      throwDart('you', outcome);
    },
    [throwDart],
  );

  useEffect(() => {
    if (!match.bustFlash) return;
    setShowBust(true);
    const timer = window.setTimeout(() => setShowBust(false), 1400);
    return () => window.clearTimeout(timer);
  }, [match.bustFlash]);

  const throwEnabled = !paused && match.phase === 'PLAYER_TURN';
  const jitterSeed = useCallback(() => Math.random(), []);
  const { throwState } = useThrow({
    config: PLAYER_THROW_CONFIG,
    nextJitterSeed: jitterSeed,
    onResolved,
    enabled: throwEnabled,
  });

  const restartMatch = useCallback(() => {
    reset();
    setResultFlash(null);
    setShowBust(false);
    setRecorded(false);
  }, [reset]);

  // Restart the match from anywhere via two-hands-raised, matching the platform's gesture convention.
  const twoHandsRaised = gesture.isTwoHandsRaised;
  useEffect(() => {
    if (twoHandsRaised) restartMatch();
  }, [twoHandsRaised, restartMatch]);

  useEffect(() => {
    if (match.winner && !recorded) {
      setRecorded(true);
      const totalPoints = match.pointsScored.you;
      recordMatch(mode, difficulty, match.winner, totalPoints, daily);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score: totalPoints }, '*');
    }
  }, [match.winner, recorded, mode, difficulty, daily, match.pointsScored.you]);

  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;
  const trackingLabel = gesture.isHovering ? 'Hand tracked' : 'Raise your hand';
  const turnDartPositions = match.turnDarts.map((d) => ({ x: d.outcome.x, y: d.outcome.y }));

  return (
    <div className="gdt-game-screen">
      <UIOverlay
        mode={mode}
        difficulty={difficulty}
        phase={match.phase}
        dartsThisTurn={match.dartsThisTurn}
        onPauseToggle={() => setPaused((p) => !p)}
        onRestart={restartMatch}
        onExit={onExit}
        paused={paused}
        gestureCursor={cursorNorm}
        trackingLabel={trackingLabel}
      />

      <div className="gdt-layout">
        <ScoreCard mode={mode} you={match.you} cpu={match.cpu} phase={match.phase} />

        <div className="gdt-board-column">
          <Dartboard throwState={throwState} turnDarts={turnDartPositions} disabled={!throwEnabled} />
          <PowerMeter power={throwState.power} state={throwState.state} config={PLAYER_THROW_CONFIG} />
        </div>
      </div>

      {resultFlash && <div className="gdt-result-flash">{resultFlash}</div>}
      {showBust && <div className="gdt-result-flash gdt-result-flash--bust">Bust!</div>}

      {paused && (
        <div className="gdt-pause-overlay">
          <h2>Paused</h2>
          <p>Hover Resume to continue.</p>
        </div>
      )}

      {match.winner && (
        <div className="gdt-victory-overlay">
          <h2>{match.winner === 'you' ? 'You Win!' : 'CPU Wins'}</h2>
          <p>Points scored: {match.pointsScored.you}</p>
          <div className="gdt-menu__row">
            <MenuButton label="Play Again" onActivate={restartMatch} />
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
      <div className="gdt-camera-gate">
        <h2>Camera unavailable</h2>
        <p>Gesture Darts needs webcam access for hand-gesture controls. Please allow camera access and reload.</p>
      </div>
    );
  }
  if (status === 'initializing') {
    return (
      <div className="gdt-camera-gate">
        <h2>Starting hand tracking…</h2>
        <p>Show your hand to the camera.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const [screen, setScreen] = useState<{ mode: GameMode; difficulty: Difficulty; daily: boolean } | null>(null);
  const gesture = useGesture();
  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;

  return (
    <div className="gdt-app">
      <CameraGate>
        {screen ? (
          <GameScreen mode={screen.mode} difficulty={screen.difficulty} daily={screen.daily} onExit={() => setScreen(null)} />
        ) : (
          <MenuScreen onStart={(mode, difficulty, daily) => setScreen({ mode, difficulty, daily })} gestureCursor={cursorNorm} />
        )}
      </CameraGate>
    </div>
  );
}
