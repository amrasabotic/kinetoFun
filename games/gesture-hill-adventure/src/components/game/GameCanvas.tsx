/**
 * GameCanvas — mounts the game canvas and wires up useGameEngine.
 * Receives the shared handRef from App so one MediaPipe instance covers
 * both gameplay and any overlays.
 */
import { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { HandData, VehicleSkin } from '../../types';
import { useGameEngine } from '../../hooks/useGameEngine';
import GameOver from '../ui/GameOver';
import { useGameStore } from '../../stores/useGameStore';

interface Props {
  handRef:   React.MutableRefObject<HandData>;
  skin:      VehicleSkin;
  settings:  { gestureSensitivity: number; sound: boolean; music: boolean; graphicsQuality: string };
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export default function GameCanvas({ handRef, skin, settings, canvasRef }: Props) {
  const setScreen   = useGameStore(s => s.setScreen);
  const lastResult  = useGameStore(s => s.lastResult);
  const screen      = useGameStore(s => s.screen);

  const { startGame, stopGame } = useGameEngine(
    canvasRef,
    handRef,
    skin,
    settings,
    () => setScreen('game-over'),
  );

  // Start game as soon as the canvas screen is active
  useEffect(() => {
    if (screen === 'playing') {
      startGame();
    }
    return () => stopGame();
  }, [screen, startGame, stopGame]);

  return (
    <div className="fixed inset-0">

      {/* Full-screen game canvas */}
      <canvas
        ref={canvasRef as React.RefObject<HTMLCanvasElement>}
        className="w-full h-full block"
      />

      {/* Game-over overlay */}
      <AnimatePresence>
        {screen === 'game-over' && lastResult && (
          <GameOver
            result={lastResult}
            onRestart={() => {
              setScreen('playing');
              startGame();
            }}
            onMenu={() => setScreen('menu')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
