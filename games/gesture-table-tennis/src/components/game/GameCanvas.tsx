import { useEffect, useRef, useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { HandData } from '../../gestures/useMediaPipe';
import type { GameMode, AIDifficulty, ArenaId, PaddleSkinId, BallSkinId, TrailId, GameSettings } from '../../types';
import { GameEngine } from '../../game/engine';
import { renderFrame } from '../../renderer/renderer';
import HUD from '../ui/HUD';
import GameOver from '../ui/GameOver';
import PauseMenu from '../ui/PauseMenu';

interface Props {
  handRef: React.MutableRefObject<HandData>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  mode: GameMode;
  difficulty: AIDifficulty;
  arenaId: ArenaId;
  paddleSkin: PaddleSkinId;
  ballSkin: BallSkinId;
  trail: TrailId;
  settings: GameSettings;
  onGameEnd: (coins: number, won: boolean) => void;
  onMenu: () => void;
}

export default function GameCanvas({ handRef, canvasRef, mode, difficulty, arenaId, paddleSkin, ballSkin, trail, settings, onGameEnd, onMenu }: Props) {
  const engineRef = useRef<GameEngine | null>(null);
  const rafRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverCoins, setGameOverCoins] = useState(0);
  const pausedRef = useRef(false);

  // Build engine on mount
  useEffect(() => {
    engineRef.current = new GameEngine(mode, difficulty, arenaId, settings.gestureSensitivity);
    setGameOver(false);
    setPaused(false);
    pausedRef.current = false;

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [mode, difficulty, arenaId]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let startTime = performance.now();

    function loop(now: number) {
      if (!engineRef.current || !canvas) { rafRef.current = requestAnimationFrame(loop); return; }

      const rawDt = Math.min((now - (prevTimeRef.current || now)) / 1000, 0.05);
      prevTimeRef.current = now;

      if (!pausedRef.current) {
        engineRef.current.update(rawDt, handRef.current);

        const gs = engineRef.current.state;
        if ((gs.matchWon || gs.matchLost) && !gameOver) {
          setGameOver(true);
          const res = engineRef.current.getResults();
          setGameOverCoins(res.coins);
          onGameEnd(res.coins, gs.matchWon);
        }

        // Render
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderFrame(ctx, gs, handRef.current, { paddleSkin, ballSkin, trail }, (now - startTime) / 1000);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [handRef, canvasRef, paddleSkin, ballSkin, trail, onGameEnd]);

  const handlePause = useCallback(() => {
    setPaused(p => {
      pausedRef.current = !p;
      return !p;
    });
  }, []);

  const handleResume = useCallback(() => {
    setPaused(false);
    pausedRef.current = false;
  }, []);

  const handlePlayAgain = useCallback(() => {
    engineRef.current = new GameEngine(mode, difficulty, arenaId, settings.gestureSensitivity);
    setGameOver(false);
    setPaused(false);
    pausedRef.current = false;
  }, [mode, difficulty, arenaId]);

  const gs = engineRef.current?.state;

  return (
    <div className="relative w-full h-full">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* HUD overlay */}
      {gs && !gameOver && !paused && (
        <HUD gs={gs} onPause={handlePause} />
      )}

      {/* Pause menu */}
      <AnimatePresence>
        {paused && !gameOver && (
          <PauseMenu onResume={handleResume} onMenu={onMenu} />
        )}
      </AnimatePresence>

      {/* Game over */}
      <AnimatePresence>
        {gameOver && gs && (
          <GameOver
            gs={gs}
            coins={gameOverCoins}
            onPlayAgain={handlePlayAgain}
            onMenu={onMenu}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
