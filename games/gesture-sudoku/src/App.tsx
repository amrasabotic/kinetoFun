import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid } from './components/Grid';
import { NumberPad } from './components/NumberPad';
import { UIOverlay } from './components/UIOverlay';
import { useGrid } from './hooks/useGrid';
import { usePuzzle } from './hooks/usePuzzle';
import { useCellSelect } from './hooks/useCellSelect';
import { useGesture, useGestureRef } from './hooks/useGesture';
import { useDwellButton } from './hooks/useDwellButton';
import type { Difficulty, GameMode } from './types';
import { sfx } from './systems/audio';
import { recordPuzzle, hasDailyCompletedToday } from './systems/save';
import { useGestureContext } from './mediaPipe/GestureProvider';

function MenuButton({ label, onActivate, active }: { label: string; onActivate: () => void; active?: boolean }) {
  const { elRef, progress } = useDwellButton(600, onActivate);
  return (
    <div ref={elRef} className={`gsd-menu-btn ${active ? 'gsd-menu-btn--active' : ''}`}>
      <div className="gsd-menu-btn__fill" style={{ width: `${progress * 100}%` }} />
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
    <div className="gsd-menu">
      <h1 className="gsd-menu__title">Gesture Sudoku</h1>
      <p className="gsd-menu__subtitle">Hover a cell and pinch to select it, then hover a number to fill it in.</p>

      <div className="gsd-menu__section">
        <h3>Mode</h3>
        <div className="gsd-menu__row">
          {(['classic', 'timed', 'zen', 'daily'] as GameMode[]).map((m) => (
            <MenuButton key={m} label={m === 'daily' && dailyDone ? 'Daily ✓' : m} active={mode === m} onActivate={() => setMode(m)} />
          ))}
        </div>
      </div>

      <div className="gsd-menu__section">
        <h3>Difficulty</h3>
        <div className="gsd-menu__row">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <MenuButton key={d} label={d} active={difficulty === d} onActivate={() => setDifficulty(d)} />
          ))}
        </div>
      </div>

      <div className="gsd-menu__section">
        <MenuButton label="Start Puzzle" onActivate={() => onStart(mode, difficulty)} />
      </div>

      {gestureCursor && (
        <div className="gsd-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
      )}
    </div>
  );
}

const TIME_LIMIT_SECONDS: Record<GameMode, number | null> = {
  classic: null,
  timed: 300,
  zen: null,
  daily: null,
};

function GameScreen({ mode, difficulty, onExit }: { mode: GameMode; difficulty: Difficulty; onExit: () => void }) {
  const { grid, selected, conflicts, solved, hintsUsed, filledCount, selectCell, setDigit, useHint, reset } = usePuzzle(
    mode,
    difficulty,
  );
  const { refreshRect, cellFromCursor } = useGrid();
  const gesture = useGesture();
  const gestureRef = useGestureRef();
  const [paused, setPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const twoHandsCooldownRef = useRef(false);

  const onSelect = useCallback(
    (cell: Parameters<typeof selectCell>[0]) => {
      sfx.select();
      selectCell(cell);
    },
    [selectCell],
  );
  const { hoveredCell } = useCellSelect({ cellFromCursor, onSelect });

  const timeLimit = TIME_LIMIT_SECONDS[mode];

  const restartPuzzle = useCallback(() => {
    reset();
    setElapsedSeconds(0);
    setFinished(false);
  }, [reset]);

  // Restart the puzzle from anywhere via two-hands-raised, matching the platform's gesture convention.
  useEffect(() => {
    const id = setInterval(() => {
      if (gestureRef.current.isTwoHandsRaised && !twoHandsCooldownRef.current) {
        twoHandsCooldownRef.current = true;
        restartPuzzle();
      } else if (!gestureRef.current.isTwoHandsRaised) {
        twoHandsCooldownRef.current = false;
      }
    }, 100);
    return () => clearInterval(id);
  }, [gestureRef, restartPuzzle]);

  useEffect(() => {
    if (paused || finished) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, finished]);

  useEffect(() => {
    if (solved && !finished) {
      setFinished(true);
      sfx.victory();
      const score = Math.max(0, 2000 - elapsedSeconds * 3 - hintsUsed * 50);
      recordPuzzle(mode, difficulty, score);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score }, '*');
    }
  }, [solved, finished, mode, difficulty, elapsedSeconds, hintsUsed]);

  useEffect(() => {
    if (mode === 'timed' && timeLimit !== null && elapsedSeconds >= timeLimit && !finished) {
      setFinished(true);
    }
  }, [mode, timeLimit, elapsedSeconds, finished]);

  const prevConflictCount = useRef(0);
  useEffect(() => {
    if (conflicts.size > prevConflictCount.current) sfx.conflict();
    prevConflictCount.current = conflicts.size;
  }, [conflicts]);

  const handlePick = useCallback(
    (value: number | null) => {
      if (value === null) sfx.erase();
      else sfx.enterDigit();
      setDigit(value);
    },
    [setDigit],
  );

  const padDisabled = !selected || (selected ? grid[selected.row][selected.col].isClue : true);

  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;
  const trackingLabel = gesture.isHovering ? 'Hand tracked' : 'Raise your hand';

  return (
    <div className="gsd-game-screen">
      <UIOverlay
        mode={mode}
        difficulty={difficulty}
        filledCount={filledCount}
        elapsedSeconds={elapsedSeconds}
        timeLimitSeconds={mode === 'timed' ? timeLimit : null}
        onHint={useHint}
        onPauseToggle={() => setPaused((p) => !p)}
        onRestart={restartPuzzle}
        onExit={onExit}
        paused={paused}
        gestureCursor={cursorNorm}
        trackingLabel={trackingLabel}
      />

      <div className="gsd-board">
        <Grid grid={grid} selected={selected} hovered={hoveredCell} conflicts={conflicts} onRectReady={refreshRect} />
        <NumberPad onPick={handlePick} disabled={padDisabled} />
      </div>

      {paused && (
        <div className="gsd-pause-overlay">
          <h2>Paused</h2>
          <p>Hover Resume to continue.</p>
        </div>
      )}

      {finished && (
        <div className="gsd-victory-overlay">
          <h2>{solved ? 'Solved!' : "Time's Up"}</h2>
          <p>{filledCount}/81 cells filled</p>
          <p>{hintsUsed} hint{hintsUsed === 1 ? '' : 's'} used</p>
          <div className="gsd-menu__row">
            <MenuButton label="Play Again" onActivate={restartPuzzle} />
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
      <div className="gsd-camera-gate">
        <h2>Camera unavailable</h2>
        <p>Gesture Sudoku needs webcam access for hand-gesture controls. Please allow camera access and reload.</p>
      </div>
    );
  }
  if (status === 'initializing') {
    return (
      <div className="gsd-camera-gate">
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
  const cursorNorm = useMemo(
    () => (gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null),
    [gesture.isHovering, gesture.cursorX, gesture.cursorY],
  );

  return (
    <div className="gsd-app">
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
