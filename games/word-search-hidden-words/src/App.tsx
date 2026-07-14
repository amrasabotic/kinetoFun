import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Grid } from './components/Grid';
import { WordList } from './components/WordList';
import { UIOverlay } from './components/UIOverlay';
import { useGrid } from './hooks/useGrid';
import { useWordSearch } from './hooks/useWordSearch';
import { useSelection } from './hooks/useSelection';
import { useGesture, useGestureRef } from './hooks/useGesture';
import { useDwellButton } from './hooks/useDwellButton';
import type { Difficulty, GameMode } from './types';
import { DIFFICULTY_CONFIG } from './types';
import { sfx } from './systems/audio';
import { recordCompletion, hasDailyCompletedToday } from './systems/save';
import { useGestureContext } from './mediaPipe/GestureProvider';

const TIME_LIMIT_SECONDS: Record<GameMode, number | null> = {
  classic: null,
  timed: 180,
  zen: null,
  daily: null,
};

function MenuButton({ label, onActivate, active }: { label: string; onActivate: () => void; active?: boolean }) {
  const { elRef, progress } = useDwellButton(600, onActivate);
  return (
    <div ref={elRef} className={`wsh-menu-btn ${active ? 'wsh-menu-btn--active' : ''}`}>
      <div className="wsh-menu-btn__fill" style={{ width: `${progress * 100}%` }} />
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
    <div className="wsh-menu">
      <h1 className="wsh-menu__title">Word Search: Hidden Words</h1>
      <p className="wsh-menu__subtitle">Point to a letter, pinch to pick it, drag while pinching to trace, release to confirm.</p>

      <div className="wsh-menu__section">
        <h3>Mode</h3>
        <div className="wsh-menu__row">
          {(['classic', 'timed', 'zen', 'daily'] as GameMode[]).map((m) => (
            <MenuButton key={m} label={m === 'daily' && dailyDone ? 'Daily ✓' : m} active={mode === m} onActivate={() => setMode(m)} />
          ))}
        </div>
      </div>

      <div className="wsh-menu__section">
        <h3>Difficulty</h3>
        <div className="wsh-menu__row">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <MenuButton key={d} label={d} active={difficulty === d} onActivate={() => setDifficulty(d)} />
          ))}
        </div>
      </div>

      <div className="wsh-menu__section">
        <MenuButton label="Start Game" onActivate={() => onStart(mode, difficulty)} />
      </div>

      {gestureCursor && (
        <div className="wsh-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
      )}
    </div>
  );
}

function GameScreen({
  mode,
  difficulty,
  onExit,
}: {
  mode: GameMode;
  difficulty: Difficulty;
  onExit: () => void;
}) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const { puzzle, regenerate, markFound, findWordMatchingPath, allFound, foundCount } = useWordSearch(difficulty, mode);
  const { cellFromCursor, refreshRect } = useGrid(config.size);
  const gesture = useGesture();
  const gestureRef = useGestureRef();
  const [paused, setPaused] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintCell, setHintCell] = useState<{ row: number; col: number } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const startRef = useRef(performance.now());
  const twoHandsCooldownRef = useRef(false);

  const onWordConfirmed = useCallback(
    (path: Parameters<typeof findWordMatchingPath>[0]) => {
      const match = findWordMatchingPath(path);
      if (match) {
        markFound(match.word);
        sfx.wordFound();
        return true;
      }
      sfx.failFade();
      return false;
    },
    [findWordMatchingPath, markFound],
  );

  const { selection } = useSelection({ cellFromCursor, onWordConfirmed });

  // Restart the level from any screen via two-hands-raised, per the gesture spec.
  useEffect(() => {
    const id = setInterval(() => {
      if (gestureRef.current.isTwoHandsRaised && !twoHandsCooldownRef.current) {
        twoHandsCooldownRef.current = true;
        regenerate();
        setElapsedSeconds(0);
        setHintCell(null);
        startRef.current = performance.now();
      } else if (!gestureRef.current.isTwoHandsRaised) {
        twoHandsCooldownRef.current = false;
      }
    }, 100);
    return () => clearInterval(id);
  }, [gestureRef, regenerate]);

  useEffect(() => {
    if (paused || finished) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [paused, finished]);

  const timeLimit = TIME_LIMIT_SECONDS[mode];

  useEffect(() => {
    if (allFound && !finished) {
      setFinished(true);
      sfx.victory();
      recordCompletion(mode, difficulty, elapsedSeconds, hintsUsed);
      const timeBonus = Math.max(0, 600 - elapsedSeconds);
      const hintPenalty = hintsUsed * 20;
      const score = Math.max(0, puzzle.words.length * 100 + timeBonus - hintPenalty);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score: Math.round(score) }, '*');
    }
  }, [allFound, finished, mode, difficulty, elapsedSeconds, hintsUsed, puzzle.words.length]);

  useEffect(() => {
    if (mode === 'timed' && timeLimit !== null && elapsedSeconds >= timeLimit && !finished) {
      setFinished(true);
    }
  }, [mode, timeLimit, elapsedSeconds, finished]);

  const onHint = useCallback(() => {
    const unfound = puzzle.words.find((w) => !w.found);
    if (!unfound) return;
    setHintCell(unfound.start);
    setHintsUsed((h) => h + 1);
    window.setTimeout(() => setHintCell(null), 1500);
  }, [puzzle.words]);

  const displayGrid = useMemo(() => puzzle.grid, [puzzle.grid]);
  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;
  const trackingLabel = gesture.isHovering ? 'Hand tracked' : 'Raise your hand';

  return (
    <div className="wsh-game-screen">
      <UIOverlay
        mode={mode}
        difficulty={difficulty}
        foundCount={foundCount}
        totalCount={puzzle.words.length}
        elapsedSeconds={elapsedSeconds}
        timeLimitSeconds={mode === 'timed' ? timeLimit : null}
        onHint={onHint}
        onRestart={regenerate}
        onPauseToggle={() => setPaused((p) => !p)}
        onExit={onExit}
        paused={paused}
        gestureCursor={cursorNorm}
        trackingLabel={trackingLabel}
      />

      <div className="wsh-board">
        <Grid grid={displayGrid} size={config.size} selection={selection} foundWords={puzzle.words} onRectReady={refreshRect} />
        <WordList words={puzzle.words} />
      </div>

      {hintCell && (
        <div
          className="wsh-hint-marker"
          style={{
            left: `${((hintCell.col + 0.5) / config.size) * 100}%`,
            top: `${((hintCell.row + 0.5) / config.size) * 100}%`,
          }}
        />
      )}

      {paused && (
        <div className="wsh-pause-overlay">
          <h2>Paused</h2>
          <p>Hover Resume to continue.</p>
        </div>
      )}

      {finished && (
        <div className="wsh-victory-overlay">
          <h2>{allFound ? 'Puzzle Solved!' : "Time's Up"}</h2>
          <p>
            {foundCount}/{puzzle.words.length} words found
          </p>
          <div className="wsh-menu__row">
            <MenuButton label="Play Again" onActivate={regenerate} />
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
      <div className="wsh-camera-gate">
        <h2>Camera unavailable</h2>
        <p>Word Search: Hidden Words needs webcam access for hand-gesture controls. Please allow camera access and reload.</p>
      </div>
    );
  }
  if (status === 'initializing') {
    return (
      <div className="wsh-camera-gate">
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
    <div className="wsh-app">
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
