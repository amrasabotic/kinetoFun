import { useEffect, useRef, useState } from 'react';
import type { HandData } from '../hooks/useMediaPipe';
import { DirectionZoneTracker, HeldGestureTracker, GESTURE_HOLD_MS } from '../hooks/useGestureControl';
import { useGameLoop } from '../hooks/useGameLoop';
import { GameEngine } from '../game/GameEngine';
import type { HudSnapshot, Settings, Vec2 } from '../types/GameTypes';
import HUD from './HUD';

interface Props {
  handRef: React.RefObject<HandData>;
  settings: Settings;
  calibration: Vec2 | null;
  active: boolean;
  level: number;
  keepScore: boolean;
  runId: number;
  highScore: number;
  onPauseRequested: () => void;
  onGameOver: (score: number, level: number) => void;
  onLevelComplete: (score: number, level: number) => void;
}

export default function GameCanvas({
  handRef,
  settings,
  calibration,
  active,
  level,
  keepScore,
  runId,
  highScore,
  onPauseRequested,
  onGameOver,
  onLevelComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine>(new GameEngine());
  const zoneTrackerRef = useRef(new DirectionZoneTracker());
  const pauseHoldRef = useRef(new HeldGestureTracker(GESTURE_HOLD_MS));
  const resolvedRef = useRef(false);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [pauseHoldProgress, setPauseHoldProgress] = useState(0);
  const lastHudAt = useRef(0);

  useEffect(() => {
    const engine = engineRef.current;
    engine.setHighScore(highScore);
    engine.loadLevel(level, performance.now(), keepScore);
    resolvedRef.current = false;
    zoneTrackerRef.current.reset();
    const canvas = canvasRef.current;
    if (canvas) engine.setViewport(window.innerWidth, window.innerHeight);
    setHud(engine.getHud(performance.now(), handRef.current?.detected ?? false, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx?.scale(dpr, dpr);
      engineRef.current.setViewport(window.innerWidth, window.innerHeight);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useGameLoop((dt, now) => {
    const engine = engineRef.current;
    const hand = handRef.current;
    if (!engine.maze) return;

    if (active) {
      const dir = zoneTrackerRef.current.sample(hand, settings, calibration);
      if (dir) engine.setDesiredDirection(dir);

      const pauseHold = pauseHoldRef.current.update(hand?.isOpen ?? false, now);
      setPauseHoldProgress(pauseHold.active ? pauseHold.progress : 0);
      if (pauseHold.justFired) onPauseRequested();

      engine.update(dt, now);

      if (!resolvedRef.current) {
        if (engine.phase === 'gameOver') {
          resolvedRef.current = true;
          onGameOver(engine.score.score, engine.score.level);
        } else if (engine.phase === 'levelComplete') {
          resolvedRef.current = true;
          onLevelComplete(engine.score.score, engine.score.level);
        }
      }
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) engine.render(ctx, now);

    if (now - lastHudAt.current > 90) {
      lastHudAt.current = now;
      setHud(engine.getHud(now, hand?.detected ?? false, !active));
    }
  }, true);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {hud && <HUD hud={hud} settings={settings} pauseHoldProgress={active ? pauseHoldProgress : 0} />}
    </div>
  );
}
