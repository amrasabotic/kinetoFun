import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { HandPosition, GameStats, GameMode, Level } from '../types/game';
import { GAME_CONFIG } from '../constants/game';
import { levels } from '../data/levels';

interface GameProps {
  mode: GameMode;
  getPosition: () => HandPosition;
  onGameOver: (stats: GameStats) => void;
  onLevelComplete: (stats: GameStats, level: Level) => void;
  onPause: () => void;
  isPaused: boolean;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
}

interface FloatingIcon {
  id: number;
  type: 'check' | 'x';
  x: number;
  y: number;
}

const CONFETTI_COLORS = ['#ffd700', '#ffea00', '#fff176', '#ffe57f', '#ffd54f', '#ffffff'];

let particleId = 0;
let iconId = 0;

export const Game: React.FC<GameProps> = ({
  mode,
  getPosition,
  onGameOver,
  onLevelComplete,
  onPause,
  isPaused
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const confettiRafRef = useRef<number | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const playerScreenPosRef = useRef({ x: 0, y: 0 });

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    starsCollected: 0,
    applesBlocked: 0,
    level: mode === 'story' ? 1 : 1,
    highScore: 0
  });

  const [currentLevel] = useState<Level | null>(
    mode === 'story' ? levels[0] : null
  );

  const [health, setHealth] = useState(GAME_CONFIG.MAX_HEALTH);
  const [progress, setProgress] = useState(0);

  // Damage state: vibrate + red glow
  const [damageActive, setDamageActive] = useState(false);
  // Floating icons (checks + X's)
  const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([]);
  // Confetti particles (canvas-drawn)
  const confettiRef = useRef<ConfettiParticle[]>([]);

  const spawnConfetti = useCallback(() => {
    const { x, y } = playerScreenPosRef.current;
    const newParticles: ConfettiParticle[] = Array.from({ length: 28 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4;
      return {
        id: particleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 4 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        life: 1,
      };
    });
    confettiRef.current = [...confettiRef.current, ...newParticles];
  }, []);

  const spawnFloatingIcon = useCallback((type: 'check' | 'x') => {
    const { x, y } = playerScreenPosRef.current;
    const id = iconId++;
    setFloatingIcons(prev => [...prev, { id, type, x, y }]);
    setTimeout(() => {
      setFloatingIcons(prev => prev.filter(i => i.id !== id));
    }, 900);
  }, []);

  // Confetti animation loop
  useEffect(() => {
    const confettiCanvas = confettiCanvasRef.current;
    if (!confettiCanvas) return;

    const tick = () => {
      const ctx = confettiCanvas.getContext('2d');
      if (!ctx) { confettiRafRef.current = requestAnimationFrame(tick); return; }

      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

      confettiRef.current = confettiRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.18,       // gravity
          vx: p.vx * 0.97,       // drag
          rotation: p.rotation + p.rotationSpeed,
          life: p.life - 0.022,
        }))
        .filter(p => p.life > 0);

      confettiRef.current.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      confettiRafRef.current = requestAnimationFrame(tick);
    };

    confettiRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current);
    };
  }, []);

  // Keep confetti canvas sized to window
  useEffect(() => {
    const resize = () => {
      const c = confettiCanvasRef.current;
      if (c) { c.width = window.innerWidth; c.height = window.innerHeight; }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        if (engineRef.current) {
          engineRef.current.resize(canvas.width, canvas.height);
        }
        // Update player screen pos reference
        const rect = canvas.getBoundingClientRect();
        playerScreenPosRef.current = {
          x: rect.left + canvas.width / 2,
          y: rect.top + canvas.height / 2,
        };
      }
    };

    updateSize();
    engineRef.current = new GameEngine(canvas.width, canvas.height);

    if (mode === 'story' && currentLevel) {
      engineRef.current.setLevel(currentLevel);
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (mode === 'story' && currentLevel && engineRef.current) {
      engineRef.current.setLevel(currentLevel);
    }
  }, [currentLevel, mode]);

  useEffect(() => {
    if (isPaused) return;

    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const deltaTime = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      const handPosition = getPosition();

      const localStats = {
        score: stats.score,
        starsCollected: stats.starsCollected,
        applesBlocked: stats.applesBlocked,
        level: stats.level,
        highScore: stats.highScore
      };

      const result = engine.update(handPosition, deltaTime, localStats);

      if (result.starHits > 0) {
        spawnConfetti();
      }

      if (result.starBlocked > 0 || localStats.applesBlocked > stats.applesBlocked) {
        spawnFloatingIcon('check');
      }

      if (result.hits > 0) {
        spawnFloatingIcon('x');
        setDamageActive(true);
        setTimeout(() => setDamageActive(false), 500);
      }

      setHealth(engine.getHealth());
      setStats(prev => ({
        ...prev,
        score: localStats.score,
        starsCollected: localStats.starsCollected,
        applesBlocked: localStats.applesBlocked
      }));

      if (mode === 'story') {
        setProgress(engine.getProgress());
      }

      if (engine.isGameOver()) {
        onGameOver(localStats);
        return;
      }

      if (mode === 'story' && engine.isLevelComplete()) {
        onLevelComplete(localStats, currentLevel!);
        return;
      }

      ctx.save();
      engine.render(ctx, damageActive);
      ctx.restore();

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPaused, stats, mode, currentLevel, getPosition, onGameOver, onLevelComplete, damageActive, spawnConfetti, spawnFloatingIcon]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full bg-slate-900" />

      {/* Confetti canvas layer */}
      <canvas
        ref={confettiCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Floating icons (check / X) */}
      {floatingIcons.map(icon => (
        <div
          key={icon.id}
          className="absolute pointer-events-none z-20 select-none font-bold"
          style={{
            left: icon.x - (canvasRef.current?.getBoundingClientRect().left ?? 0),
            top: icon.y - (canvasRef.current?.getBoundingClientRect().top ?? 0),
            transform: 'translate(-50%, -50%)',
            animation: 'floatUp 0.9s ease-out forwards',
            fontSize: icon.type === 'x' ? '2rem' : '1.75rem',
            color: icon.type === 'check' ? '#4ecca7' : '#ff4757',
            textShadow: icon.type === 'check'
              ? '0 0 12px rgba(78,204,167,0.9)'
              : '0 0 12px rgba(255,71,87,0.9)',
          }}
        >
          {icon.type === 'check' ? '✓' : '✕'}
        </div>
      ))}

      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-lg backdrop-blur-sm">
            <span className="text-white font-bold text-xl">{stats.score.toLocaleString()}</span>
            <span className="text-slate-400 text-sm">pts</span>
          </div>

          <div className="flex gap-1">
            {[...Array(GAME_CONFIG.MAX_HEALTH)].map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full transition-all duration-300 ${
                  i < health
                    ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {mode === 'story' && currentLevel && (
            <div className="flex flex-col items-end bg-slate-900/80 px-4 py-2 rounded-lg backdrop-blur-sm">
              <span className="text-emerald-400 font-semibold">{currentLevel.name}</span>
              <div className="w-32 h-2 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={onPause}
            className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-lg backdrop-blur-sm transition-colors"
          >
            Pause
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-10">
        <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-slate-300 text-sm">{stats.starsCollected}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-slate-300 text-sm">{stats.applesBlocked}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
