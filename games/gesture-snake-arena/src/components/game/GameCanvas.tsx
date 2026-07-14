import { useRef, useEffect, useState, useCallback } from 'react';
import type { RefObject } from 'react';
import type { HandData } from '../../gestures/useMediaPipe';
import { useGameEngine, type GameHUDState } from '../../hooks/useGameEngine';
import { useGameStore } from '../../stores/useGameStore';
import HUD from '../ui/HUD';
import GameOverScreen from '../ui/GameOverScreen';

interface Props {
  handRef: RefObject<HandData>;
  canvasRef: RefObject<HTMLCanvasElement>;
}

export default function GameCanvas({ handRef, canvasRef }: Props) {
  const [hudState, setHudState] = useState<GameHUDState | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);

  const activeSkinColors = useGameStore(s => s.activeSkinColors);
  const save = useGameStore(s => s.save);
  const setScreen = useGameStore(s => s.setScreen);
  const recordGameOver = useGameStore(s => s.recordGameOver);

  const handleGameOver = useCallback((
    score: number, length: number, survivalMs: number,
    energyCollected: number, aiDefeated: number,
    powerUps: number, boosts: number, combo: number, coins: number,
  ) => {
    recordGameOver(score, length, survivalMs, energyCollected, aiDefeated, powerUps, boosts, combo, coins);
    setShowGameOver(true);
  }, [recordGameOver]);

  const { startGame, stopGame } = useGameEngine(
    canvasRef as RefObject<HTMLCanvasElement>,
    handRef,
    activeSkinColors,
    save.settings,
    handleGameOver,
    setHudState,
  );

  useEffect(() => {
    startGame();
    return () => stopGame();
  }, [startGame, stopGame]);

  return (
    <div className="relative w-full h-screen">
      <canvas ref={canvasRef as RefObject<HTMLCanvasElement>} className="absolute inset-0 w-full h-full" />

      {hudState && !showGameOver && (
        <HUD hudState={hudState} settings={save.settings} />
      )}

      {showGameOver && (
        <GameOverScreen
          score={Math.floor(hudState?.score ?? 0)}
          length={Math.floor(hudState?.length ?? 0)}
          survivalMs={hudState?.survivalMs ?? 0}
          highScore={save.statistics.highScore}
          onRestart={() => {
            setShowGameOver(false);
            startGame();
          }}
          onMenu={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
