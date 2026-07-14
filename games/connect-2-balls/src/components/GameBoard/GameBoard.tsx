import { useRef, useEffect, useState, useCallback } from 'react';
import { LevelData, PathSegment, Position, Theme, GameMode } from '../../data/types';
import { useGesture, useGestureEvent } from '../../systems/GestureManager';
import { usePuzzle } from '../../hooks/usePuzzle';
import { snapToGrid } from '../../systems/PathSystem';

interface GameBoardProps {
  level: LevelData;
  theme: Theme;
  mode: GameMode;
  settings: { sensitivity: number; leftHanded: boolean; largeCursor: boolean; colorblindMode: boolean; reducedParticles: boolean };
  onComplete: (score: number, stars: number) => void;
  onPause: () => void;
  onHint: () => void;
  hintsAvailable: number;
}

export default function GameBoard({
  level,
  theme,
  mode,
  settings,
  onComplete,
  onPause,
  onHint,
  hintsAvailable,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }>>([]);

  const { state: gestureState } = useGesture();

  const {
    gameState,
    completed,
    hintCell,
    startDrawing,
    extendPath,
    finishDrawing,
    cancelDrawing,
    undoLastPath,
    useHint,
    getScore,
  } = usePuzzle(level, mode);

  const cellSize = Math.min(canvasSize.width, canvasSize.height) / (level.gridSize + 2);
  const gridOffset = {
    x: (canvasSize.width - cellSize * level.gridSize) / 2,
    y: (canvasSize.height - cellSize * level.gridSize) / 2,
  };

  const canvasOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height - 80);
        setCanvasSize({ width: size, height: size });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Track canvas offset for coordinate conversion
  useEffect(() => {
    const updateOffset = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        canvasOffsetRef.current = { x: rect.left, y: rect.top };
      }
    };
    updateOffset();
    window.addEventListener('resize', updateOffset);
    return () => window.removeEventListener('resize', updateOffset);
  }, [canvasSize]);

  // Convert screen coords to canvas-local coords, then to grid position
  const screenToGrid = useCallback((screenX: number, screenY: number): Position | null => {
    const localX = screenX - canvasOffsetRef.current.x;
    const localY = screenY - canvasOffsetRef.current.y;
    return snapToGrid(localX, localY, gridOffset.x, gridOffset.y, cellSize, level.gridSize);
  }, [gridOffset, cellSize, level.gridSize]);

  // Gesture event handlers
  const prevPinchRef = useRef(false);

  useEffect(() => {
    const { cursor, isPinching } = gestureState;
    const gridPos = screenToGrid(cursor.x, cursor.y);

    if (!gridPos) {
      prevPinchRef.current = isPinching;
      return;
    }

    // Start drawing on pinch start
    if (isPinching && !prevPinchRef.current) {
      startDrawing(gridPos);
    }

    // Extend path while pinching
    if (isPinching && gameState.isDrawing) {
      extendPath(gridPos);
    }

    // Finish on pinch release
    if (!isPinching && prevPinchRef.current && gameState.isDrawing) {
      finishDrawing(gridPos);
    }

    prevPinchRef.current = isPinching;
  }, [gestureState.cursor, gestureState.isPinching, gameState.isDrawing, screenToGrid, startDrawing, extendPath, finishDrawing]);

  // Open palm -> cancel drawing
  useGestureEvent('openPalm', useCallback(() => {
    cancelDrawing();
  }, [cancelDrawing]));

  // Swipe left -> undo
  useGestureEvent('swipeLeft', useCallback(() => {
    undoLastPath();
  }, [undoLastPath]));

  // Closed fist -> pause
  useGestureEvent('closedFist', useCallback(() => {
    onPause();
  }, [onPause]));

  // Swipe up -> hint (alternative to raising hand)
  useGestureEvent('swipeUp', useCallback(() => {
    if (hintsAvailable > 0) {
      useHint();
      onHint();
    }
  }, [hintsAvailable, useHint, onHint]));

  // Level complete
  useEffect(() => {
    if (completed) {
      const { score, stars } = getScore();
      spawnCompletionParticles();
      setTimeout(() => onComplete(score, stars), 1500);
    }
  }, [completed]);

  const spawnCompletionParticles = () => {
    if (settings.reducedParticles) return;
    const particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvasSize.width / 2 + (Math.random() - 0.5) * 200,
        y: canvasSize.height / 2 + (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 3,
        life: 1,
        color: theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)],
        size: Math.random() * 6 + 3,
      });
    }
    particlesRef.current = particles;
  };

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const render = () => {
      timeRef.current += 0.016;
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      drawGrid(ctx);
      drawWalls(ctx);
      drawPaths(ctx, gameState.paths);
      if (gameState.activePath) drawActivePath(ctx, gameState.activePath);
      drawBalls(ctx);
      if (hintCell) drawHint(ctx, hintCell);
      drawGameCursor(ctx);
      updateAndDrawParticles(ctx);

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, [canvasSize, gameState, hintCell, gestureState.cursor, gestureState.isPinching, theme, settings]);

  function drawGrid(ctx: CanvasRenderingContext2D) {
    for (let r = 0; r < level.gridSize; r++) {
      for (let c = 0; c < level.gridSize; c++) {
        const x = gridOffset.x + c * cellSize;
        const y = gridOffset.y + r * cellSize;
        ctx.fillStyle = theme.cellColor;
        ctx.strokeStyle = theme.cellBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 6);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function drawWalls(ctx: CanvasRenderingContext2D) {
    if (!level.walls) return;
    for (const wall of level.walls) {
      const x = gridOffset.x + wall.col * cellSize;
      const y = gridOffset.y + wall.row * cellSize;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, cellSize - 8, cellSize - 8, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + cellSize * 0.3, y + cellSize * 0.3);
      ctx.lineTo(x + cellSize * 0.7, y + cellSize * 0.7);
      ctx.moveTo(x + cellSize * 0.7, y + cellSize * 0.3);
      ctx.lineTo(x + cellSize * 0.3, y + cellSize * 0.7);
      ctx.stroke();
    }
  }

  function drawPaths(ctx: CanvasRenderingContext2D, paths: PathSegment[]) {
    for (const path of paths) {
      drawPathLine(ctx, path.cells, path.color, path.completed);
    }
  }

  function drawActivePath(ctx: CanvasRenderingContext2D, path: PathSegment) {
    drawPathLine(ctx, path.cells, path.color, false);
  }

  function drawPathLine(ctx: CanvasRenderingContext2D, cells: Position[], color: string, isCompleted: boolean) {
    if (cells.length < 2) {
      if (cells.length === 1) {
        const x = gridOffset.x + cells[0].col * cellSize + cellSize / 2;
        const y = gridOffset.y + cells[0].row * cellSize + cellSize / 2;
        ctx.beginPath();
        ctx.arc(x, y, cellSize * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      return;
    }

    ctx.beginPath();
    const startX = gridOffset.x + cells[0].col * cellSize + cellSize / 2;
    const startY = gridOffset.y + cells[0].row * cellSize + cellSize / 2;
    ctx.moveTo(startX, startY);
    for (let i = 1; i < cells.length; i++) {
      const x = gridOffset.x + cells[i].col * cellSize + cellSize / 2;
      const y = gridOffset.y + cells[i].row * cellSize + cellSize / 2;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = cellSize * 0.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = isCompleted ? 0.8 : 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (isCompleted && !settings.reducedParticles) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = cellSize * 0.2;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function drawBalls(ctx: CanvasRenderingContext2D) {
    const pulse = Math.sin(timeRef.current * 3) * 0.1 + 1;
    for (let i = 0; i < level.pairs.length; i++) {
      const pair = level.pairs[i];
      const isActive = gameState.activePath?.pairId === i;
      const isCompleted = gameState.paths.some((p) => p.pairId === i && p.completed);

      for (const pos of pair.positions) {
        const x = gridOffset.x + pos.col * cellSize + cellSize / 2;
        const y = gridOffset.y + pos.row * cellSize + cellSize / 2;
        const radius = cellSize * 0.32 * (isActive ? pulse : 1);

        if (isActive && !settings.reducedParticles) {
          ctx.beginPath();
          ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = pair.color;
          ctx.globalAlpha = 0.2;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        gradient.addColorStop(0, lightenColor(pair.color, 40));
        gradient.addColorStop(0.7, pair.color);
        gradient.addColorStop(1, darkenColor(pair.color, 30));

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = isCompleted ? 0.7 : 1;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.beginPath();
        ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();
      }
    }
  }

  function drawHint(ctx: CanvasRenderingContext2D, pos: Position) {
    const x = gridOffset.x + pos.col * cellSize + cellSize / 2;
    const y = gridOffset.y + pos.row * cellSize + cellSize / 2;
    const pulse = Math.sin(timeRef.current * 5) * 0.3 + 0.7;
    ctx.beginPath();
    ctx.arc(x, y, cellSize * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = theme.accentColor;
    ctx.globalAlpha = pulse;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawGameCursor(ctx: CanvasRenderingContext2D) {
    // Convert screen cursor to local canvas coords
    const localX = gestureState.cursor.x - canvasOffsetRef.current.x;
    const localY = gestureState.cursor.y - canvasOffsetRef.current.y;

    if (localX < 0 || localX > canvasSize.width || localY < 0 || localY > canvasSize.height) return;

    const size = settings.largeCursor ? 20 : 14;
    const isPinching = gestureState.isPinching;

    ctx.beginPath();
    ctx.arc(localX, localY, size, 0, Math.PI * 2);
    ctx.strokeStyle = isPinching ? theme.accentColor : 'rgba(255,255,255,0.8)';
    ctx.lineWidth = isPinching ? 3 : 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(localX, localY, isPinching ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = isPinching ? theme.accentColor : 'rgba(255,255,255,0.9)';
    ctx.fill();

    if (!settings.reducedParticles && isPinching) {
      particlesRef.current.push({
        x: localX,
        y: localY,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0.5,
        color: theme.accentColor,
        size: 3,
      });
    }
  }

  function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;
      if (p.life <= 0) return false;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
      ctx.globalAlpha = 1;
      return true;
    });
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center">
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium opacity-80" style={{ color: theme.textColor }}>
            Level {level.id > 0 ? level.id : 'Custom'}
          </span>
          <span className="text-sm opacity-60" style={{ color: theme.textColor }}>
            {gameState.paths.filter((p) => p.completed).length}/{level.pairs.length} pairs
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hintsAvailable > 0 && (
            <div
              className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.15)', color: theme.textColor }}
            >
              Hints: {hintsAvailable}
            </div>
          )}
          <div
            className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md"
            style={{ background: 'rgba(255,255,255,0.10)', color: theme.textColor }}
          >
            Fist = Pause
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="rounded-2xl cursor-none"
        style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 160px)' }}
      />

      {/* Gesture indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div
          className="px-4 py-2 rounded-full text-xs font-medium backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.1)', color: theme.textColor }}
        >
          {gestureState.isPinching && gameState.isDrawing && 'Drawing path...'}
          {gestureState.isPinching && !gameState.isDrawing && 'Pinch on a ball to start'}
          {!gestureState.isPinching && !gestureState.isHandDetected && 'Show hand to play'}
          {!gestureState.isPinching && gestureState.isHandDetected && 'Move to ball, pinch to draw'}
        </div>
      </div>

      {/* Completion overlay */}
      {completed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl z-20">
          <div className="text-center animate-bounce-in">
            <div className="text-4xl font-bold mb-2" style={{ color: theme.accentColor }}>
              Level Complete!
            </div>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3].map((s) => (
                <svg key={s} className={`w-8 h-8 ${s <= getScore().stars ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <div className="text-lg opacity-80" style={{ color: theme.textColor }}>
              Score: {getScore().score}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}
