import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { HandData } from '../../gestures/useMediaPipe';
import type { HudState, GameOverSummary } from '../../types';
import { useGameEngine } from '../../hooks/useGameEngine';
import { useGameStore } from '../../stores/useGameStore';
import { useLeaderboardStore } from '../../stores/useLeaderboardStore';
import { colorThemeIndex } from '../../game/cosmetics/cosmeticDefs';
import GestureCursorDot from '../common/GestureCursorDot';
import HUD from '../ui/HUD';
import PauseOverlay from './PauseOverlay';
import GameOverScreen from '../ui/GameOverScreen';

interface Props {
  handRef: RefObject<HandData>;
  canvasRef: RefObject<HTMLCanvasElement>;
}

export default function GameCanvas({ handRef, canvasRef }: Props) {
  const [hud, setHud] = useState<HudState | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);

  const save = useGameStore((s) => s.save);
  const setScreen = useGameStore((s) => s.setScreen);
  const recordGameOver = useGameStore((s) => s.recordGameOver);
  const addLeaderboardResult = useLeaderboardStore((s) => s.addResult);

  const cosmetics = {
    colorIndex: colorThemeIndex(save.selectedCosmetics.colorTheme),
    hatId: save.selectedCosmetics.hat === 'none-hat' ? null : save.selectedCosmetics.hat,
    capeId: save.selectedCosmetics.cape === 'none-cape' ? null : save.selectedCosmetics.cape,
  };

  const handleGameOver = useCallback((summary: GameOverSummary) => {
    recordGameOver(summary);
    addLeaderboardResult(summary);
    setShowGameOver(true);
  }, [recordGameOver, addLeaderboardResult]);

  const { startGame, stopGame } = useGameEngine(
    canvasRef,
    handRef,
    cosmetics,
    save.settings,
    handleGameOver,
    setHud,
  );

  useEffect(() => {
    startGame();
    return () => stopGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startGame, stopGame]);

  return (
    <div className="relative w-full h-screen">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {hud && !showGameOver && <HUD hud={hud} />}

      {hud?.paused && !showGameOver && <PauseOverlay />}

      {showGameOver && <GestureCursorDot />}
      {showGameOver && hud && (
        <GameOverScreen
          score={hud.score}
          highScore={save.statistics.highScore}
          onPlayAgain={() => { setShowGameOver(false); startGame(); }}
          onMenu={() => setScreen('menu')}
        />
      )}
    </div>
  );
}
