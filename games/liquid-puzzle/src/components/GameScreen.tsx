import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameMode, Settings } from '../types';
import { levelConfig } from '../utils/puzzleGenerator';
import { useGameSession } from '../hooks/useGameSession';
import { useTubeInteraction } from '../hooks/useTubeInteraction';
import { useActionGestures } from '../hooks/useActionGestures';
import { useGesture } from '../hooks/useGesture';
import { isMoveLegal } from '../systems/puzzleRules';
import { computeScore, computeStars, type ScoreInput } from '../utils/scoring';
import { sfx } from '../systems/audio';
import { GameBoard } from './GameBoard';
import { HUD } from './HUD';
import { PauseMenu } from './PauseMenu';
import { WinOverlay } from './WinOverlay';
import { Cursor } from './Cursor';
import type { PourEffectSpec } from './PourEffect';

export interface WinResult {
  mode: GameMode;
  level: number;
  stars: 1 | 2 | 3;
  movesUsed: number;
  hintsUsed: number;
  undosUsed: number;
  elapsedMs: number;
  score: number;
}

interface GameScreenProps {
  mode: GameMode;
  level: number;
  seed: number;
  settings: Settings;
  onExit: () => void;
  /** Called once, the moment the puzzle is solved — the parent is responsible for persisting the result. */
  onWin: (result: WinResult) => void;
  /** Present for Levels/Endless — advances to the next level (parent bumps the level+remounts this screen). */
  onAdvance: (() => void) | null;
  /** Remounts this screen with a fresh board for the same level. */
  onRestart: () => void;
}

let effectIdCounter = 0;

export function GameScreen({ mode, level, seed, settings, onExit, onWin, onAdvance, onRestart }: GameScreenProps) {
  const config = levelConfig(level);
  const session = useGameSession(config, seed);
  const gesture = useGesture();
  const tubeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [paused, setPaused] = useState(false);
  const [rejectingIndex, setRejectingIndex] = useState<number | null>(null);
  const [pourEffects, setPourEffects] = useState<PourEffectSpec[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [winSnapshot, setWinSnapshot] = useState<WinResult | null>(null);

  const gameplayEnabled = !paused && !session.isSolved;

  const handlePour = useCallback(
    (from: number, to: number) => {
      if (!isMoveLegal(session.board, { from, to })) {
        sfx.error();
        setRejectingIndex(to);
        window.setTimeout(() => setRejectingIndex((r) => (r === to ? null : r)), 450);
        return;
      }

      const fromEl = tubeRefs.current[from];
      const toEl = tubeRefs.current[to];
      const color = session.board[from].colors[session.board[from].colors.length - 1];
      const applied = session.pour(from, to);
      if (applied && fromEl && toEl) {
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        setPourEffects((prev) => [
          ...prev,
          {
            id: effectIdCounter++,
            fromX: fr.left + fr.width / 2,
            fromY: fr.top + 24,
            toX: tr.left + tr.width / 2,
            toY: tr.top + 24,
            color,
          },
        ]);
        sfx.pour();
        window.setTimeout(() => sfx.glassClink(), settings.animationQuality === 'low' ? 200 : 350);
      }
    },
    [session, settings.animationQuality],
  );

  const interaction = useTubeInteraction({
    tubeRefs,
    onPour: handlePour,
    enabled: gameplayEnabled,
  });

  const handleUndo = useCallback(() => {
    if (session.movesUsed === 0) return;
    session.undo();
    interaction.clearSelection();
    sfx.undo();
  }, [session, interaction]);

  const handleHint = useCallback(() => {
    const hint = session.requestHint();
    if (hint) sfx.hint();
  }, [session]);

  useActionGestures({
    onUndo: handleUndo,
    onHint: handleHint,
    onPause: () => setPaused(true),
    enabled: !session.isSolved && !paused,
  });

  // Elapsed-time ticker, paused while the pause menu is open.
  useEffect(() => {
    if (paused || session.isSolved) return;
    const id = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [paused, session.isSolved]);

  useEffect(() => {
    if (!session.isSolved || winSnapshot) return;
    const elapsedMs = session.elapsedMs();
    const scoreInput: ScoreInput = {
      movesUsed: session.movesUsed,
      parMoves: session.parMoves,
      hintsUsed: session.hintsUsed,
      undosUsed: session.undosUsed,
      emptyTubesRemaining: session.board.filter((t) => t.colors.length === 0).length,
      elapsedMs,
    };
    const result: WinResult = {
      mode,
      level,
      stars: computeStars(scoreInput),
      movesUsed: session.movesUsed,
      hintsUsed: session.hintsUsed,
      undosUsed: session.undosUsed,
      elapsedMs,
      score: computeScore(scoreInput),
    };
    sfx.victory();
    setWinSnapshot(result);
    onWin(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isSolved]);

  const removePourEffect = useCallback((id: number) => {
    setPourEffects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const trackingLabel = gesture.isHovering ? 'Hand tracked' : 'Raise your hand';
  const levelLabel = mode === 'daily' ? "Today's Challenge" : `Level ${level}`;

  return (
    <div className="lp-screen lp-game-screen">
      <HUD
        mode={mode}
        levelLabel={levelLabel}
        movesUsed={session.movesUsed}
        hintsUsed={session.hintsUsed}
        undosUsed={session.undosUsed}
        elapsedSeconds={elapsedSeconds}
        trackingLabel={trackingLabel}
      />

      <GameBoard
        board={session.board}
        hoveredIndex={interaction.hoveredIndex}
        grabbedIndex={interaction.selectedIndex}
        hintMove={session.activeHint}
        rejectingIndex={rejectingIndex}
        colorblindMode={settings.colorblindMode}
        animationQuality={settings.animationQuality}
        tubeRefs={tubeRefs}
        pourEffects={pourEffects}
        onPourEffectComplete={removePourEffect}
      />

      <div className="lp-gesture-legend">
        <span>Pinch: grab tube, drag onto another to pour</span>
        <span>Thumbs up: undo</span>
        <span>Victory sign: hint</span>
        <span>Open palm 2s: pause</span>
      </div>

      {!paused && !session.isSolved && <Cursor gesture={gesture} />}

      {paused && <PauseMenu onResume={() => setPaused(false)} onRestart={onRestart} onExit={onExit} gesture={gesture} />}

      {winSnapshot && (
        <WinOverlay
          stars={winSnapshot.stars}
          movesUsed={winSnapshot.movesUsed}
          hintsUsed={winSnapshot.hintsUsed}
          elapsedSeconds={Math.round(winSnapshot.elapsedMs / 1000)}
          score={winSnapshot.score}
          onNext={mode === 'daily' ? null : onAdvance}
          onReplay={onRestart}
          onExit={onExit}
          gesture={gesture}
          reducedMotion={settings.animationQuality === 'low'}
        />
      )}
    </div>
  );
}
