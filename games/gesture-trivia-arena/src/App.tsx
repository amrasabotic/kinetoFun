import { useCallback, useEffect, useRef, useState } from 'react';
import { AnswerTile } from './components/AnswerTile';
import { useGesture } from './hooks/useGesture';
import { useDwellButton } from './hooks/useDwellButton';
import { useMatch } from './hooks/useMatch';
import type { Category, Difficulty, GameMode } from './types';
import { BLITZ_TIME_LIMIT_MS, TOTAL_ROUNDS } from './types';
import { questionById } from './data/questions';
import { recordMatch, hasDailyCompletedToday } from './systems/save';
import { useGestureContext } from './mediaPipe/GestureProvider';

function MenuButton({ label, onActivate, active }: { label: string; onActivate: () => void; active?: boolean }) {
  const { elRef, progress } = useDwellButton(600, onActivate);
  return (
    <div ref={elRef} className={`gta-menu-btn ${active ? 'gta-menu-btn--active' : ''}`}>
      <div className="gta-menu-btn__fill" style={{ width: `${progress * 100}%` }} />
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
  const [mode, setMode] = useState<GameMode>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [daily, setDaily] = useState(false);
  const dailyDone = hasDailyCompletedToday();

  return (
    <div className="gta-menu">
      <h1 className="gta-menu__title">Gesture Trivia Arena</h1>
      <p className="gta-menu__subtitle">Point at an answer and hold to select it — first to out-score the CPU over 9 rounds wins.</p>

      <div className="gta-menu__section">
        <h3>Mode</h3>
        <div className="gta-menu__row">
          <MenuButton label="Classic" active={mode === 'classic'} onActivate={() => setMode('classic')} />
          <MenuButton label="Blitz (timed)" active={mode === 'blitz'} onActivate={() => setMode('blitz')} />
        </div>
      </div>

      <div className="gta-menu__section">
        <h3>CPU Difficulty</h3>
        <div className="gta-menu__row">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <MenuButton key={d} label={d} active={difficulty === d} onActivate={() => setDifficulty(d)} />
          ))}
        </div>
      </div>

      <div className="gta-menu__section">
        <MenuButton
          label={daily ? (dailyDone ? 'Daily ✓' : 'Daily (on)') : 'Daily Challenge'}
          active={daily}
          onActivate={() => setDaily((d) => !d)}
        />
      </div>

      <div className="gta-menu__section">
        <MenuButton label="Start Match" onActivate={() => onStart(mode, difficulty, daily)} />
      </div>

      {gestureCursor && (
        <div className="gta-cursor-dot" style={{ left: `${gestureCursor.x * 100}%`, top: `${gestureCursor.y * 100}%` }} />
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
  const { match, answer, timeout, advance, reset } = useMatch(mode, difficulty, daily);
  const gesture = useGesture();
  const [paused, setPaused] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(BLITZ_TIME_LIMIT_MS);
  const roundStartRef = useRef(performance.now());

  useEffect(() => {
    roundStartRef.current = performance.now();
  }, [match.roundIndex]);

  // Blitz mode's per-question countdown — timing out counts as a wrong answer.
  useEffect(() => {
    if (mode !== 'blitz' || match.phase !== 'ANSWERING' || paused) return;
    setTimeLeftMs(BLITZ_TIME_LIMIT_MS);
    const start = performance.now();
    let raf = 0;
    function tick() {
      const remaining = Math.max(0, BLITZ_TIME_LIMIT_MS - (performance.now() - start));
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        timeout();
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, match.phase, match.roundIndex, paused, timeout]);

  const handleSelect = useCallback(
    (index: number) => {
      answer(index, performance.now() - roundStartRef.current);
    },
    [answer],
  );

  const restartMatch = useCallback(() => {
    reset();
    setRecorded(false);
  }, [reset]);

  useEffect(() => {
    if (match.winner && !recorded) {
      setRecorded(true);
      const totalPoints = match.playerScore;
      const categoriesCorrect = match.history
        .filter((h) => h.playerCorrect)
        .map((h) => questionById(h.questionId)?.category)
        .filter((c): c is Category => c !== undefined);
      recordMatch(mode, difficulty, match.winner, totalPoints, match.playerCorrectCount, categoriesCorrect, daily);
      window.parent?.postMessage({ type: 'GAME_COMPLETE', score: totalPoints }, '*');
    }
  }, [match.winner, recorded, mode, difficulty, daily, match.playerScore, match.playerCorrectCount, match.history, match.questions]);

  const cursorNorm = gesture.isHovering ? { x: gesture.cursorX, y: gesture.cursorY } : null;
  const trackingLabel = gesture.isHovering ? 'Hand tracked' : 'Raise your hand';
  const question = match.questions[match.roundIndex];
  const answering = match.phase === 'ANSWERING' && !paused;

  function tileState(i: number): 'idle' | 'correct' | 'wrong' | 'unselected' {
    if (match.phase === 'ANSWERING') return 'idle';
    if (i === question.correctIndex) return 'correct';
    if (i === match.playerAnswerIndex) return 'wrong';
    return 'unselected';
  }

  return (
    <div className="gta-game-screen">
      <div className="gta-hud">
        <div className="gta-hud__left">
          <span className="gta-hud__badge">{mode.toUpperCase()}</span>
          <span className="gta-hud__round">Round {Math.min(match.roundIndex + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</span>
        </div>
        <div className="gta-hud__center">
          <span className="gta-hud__score">You {match.playerScore}</span>
          <span className="gta-hud__score-sep">—</span>
          <span className="gta-hud__score">CPU {match.cpuScore}</span>
        </div>
        <div className="gta-hud__right">
          <span className="gta-hud__tracking">{trackingLabel}</span>
          <MenuButton label={paused ? 'Resume' : 'Pause'} onActivate={() => setPaused((p) => !p)} />
          <MenuButton label="Exit" onActivate={onExit} />
        </div>
      </div>

      {mode === 'blitz' && match.phase === 'ANSWERING' && (
        <div className="gta-timer-track">
          <div className="gta-timer-fill" style={{ width: `${(timeLeftMs / BLITZ_TIME_LIMIT_MS) * 100}%` }} />
        </div>
      )}

      <div className="gta-question-card">
        <span className="gta-question-card__category">{question.category.replace('-', ' ').toUpperCase()}</span>
        <h2 className="gta-question-card__text">{question.question}</h2>
      </div>

      <div className="gta-answers-grid">
        {question.options.map((opt, i) => (
          <AnswerTile key={`${question.id}-${i}`} label={opt} index={i} onSelect={handleSelect} enabled={answering} state={tileState(i)} />
        ))}
      </div>

      {match.phase === 'REVEAL' && !match.winner && (
        <div className="gta-reveal-row">
          <span className={match.playerCorrect ? 'gta-reveal--good' : 'gta-reveal--bad'}>
            You: {match.playerCorrect ? 'Correct!' : 'Incorrect'}
          </span>
          <span className={match.cpuOutcome.correct ? 'gta-reveal--good' : 'gta-reveal--bad'}>
            CPU: {match.cpuOutcome.correct ? 'Correct' : 'Incorrect'}
          </span>
          <MenuButton label="Next" onActivate={advance} />
        </div>
      )}

      {gestureCursorDot(cursorNorm)}

      {paused && !match.winner && (
        <div className="gta-pause-overlay">
          <h2>Paused</h2>
          <p>Hover Resume to continue.</p>
        </div>
      )}

      {match.winner && (
        <div className="gta-victory-overlay">
          <h2>{match.winner === 'you' ? 'You Win!' : match.winner === 'cpu' ? 'CPU Wins' : "It's a Tie!"}</h2>
          <p>Final score — You: {match.playerScore}, CPU: {match.cpuScore}</p>
          <p>Correct answers: {match.playerCorrectCount}/{TOTAL_ROUNDS}</p>
          <div className="gta-menu__row">
            <MenuButton label="Play Again" onActivate={restartMatch} />
            <MenuButton label="Menu" onActivate={onExit} />
          </div>
        </div>
      )}
    </div>
  );
}

function gestureCursorDot(cursor: { x: number; y: number } | null) {
  if (!cursor) return null;
  return <div className="gta-cursor-dot" style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }} />;
}

function CameraGate({ children }: { children: React.ReactNode }) {
  const { status } = useGestureContext();
  if (status === 'no-camera' || status === 'error') {
    return (
      <div className="gta-camera-gate">
        <h2>Camera unavailable</h2>
        <p>Gesture Trivia Arena needs webcam access for hand-gesture controls. Please allow camera access and reload.</p>
      </div>
    );
  }
  if (status === 'initializing') {
    return (
      <div className="gta-camera-gate">
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
    <div className="gta-app">
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
