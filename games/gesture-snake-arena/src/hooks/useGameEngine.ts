import { useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import type { HandData } from '../gestures/useMediaPipe';
import { processGesture, resetSmoothing } from '../gestures/gestureRecognizer';
import {
  createPlayerSnake, updatePlayerSnake, growSnake, addPowerUp, killPlayerSnake,
} from '../game/snake/Snake';
import {
  createAISnake, updateAISnake, respawnAISnake,
} from '../game/ai/AISnake';
import {
  initOrbs, updateOrbs, spawnDroppedOrbs, createOrb,
} from '../game/collectibles/EnergyOrb';
import {
  initPowerUps, updatePowerUps, createPowerUp, getPowerUpDuration,
} from '../game/collectibles/PowerUp';
import { runCollisions } from '../game/collisions/CollisionSystem';
import { ParticleSystem } from '../game/particles/ParticleSystem';
import { renderFrame, renderMinimap } from '../game/renderer/Renderer';
import { createCamera, updateCamera } from '../game/camera/Camera';
import { pickEnvironment, generateDecorations } from '../game/arena/arenaConfig';
import {
  playPickup, playBoost, playDeath, playKill, playPowerUp, playCombo,
} from '../game/audio/audioSystem';
import {
  AI_COUNT, ORB_COUNT, POWERUP_COUNT, SCORE_PER_SECOND,
  SCORE_PER_KILL, COMBO_MULTIPLIERS, COMBO_WINDOW_MS,
  POWERUP_DURATION_MS, QUEST_TEMPLATES,
} from '../constants/gameConfig';
import type {
  PlayerSnakeState, AISnakeState, EnergyOrb, PowerUp,
  FloatingText, Quest, LeaderEntry, Environment,
  ActivePowerUp,
} from '../types';
import type { ArenaDecoration } from '../game/arena/arenaConfig';

// ── Mutable state held in a ref (avoids React re-render on every frame) ────────

interface GameState {
  player: PlayerSnakeState;
  aiSnakes: AISnakeState[];
  orbs: EnergyOrb[];
  powerUps: PowerUp[];
  particles: ParticleSystem;
  floatingTexts: FloatingText[];
  quests: Quest[];
  environment: Environment;
  decorations: ArenaDecoration[];
  survivalMs: number;
  energyCollected: number;
  aiDefeated: number;
  powerUpsCollected: number;
  comboRecord: number;
  coinsEarned: number;
  scoreMultiplier: number;
  orbRespawnTimer: number;
  floatTextId: number;
  slowMoTimer: number;      // freeze power-up
  lastLeaderboard: LeaderEntry[];
  freezeActive: boolean;
}

export interface GameHUDState {
  score: number;
  length: number;
  combo: number;
  boostCooldown: number;
  boostActive: boolean;
  survivalMs: number;
  aiAlive: number;
  activePowerUps: ActivePowerUp[];
  quests: Quest[];
  leaderboard: LeaderEntry[];
  playerAlive: boolean;
  speed: number;
  handDetected: boolean;
}

let hudCallbackFn: ((state: GameHUDState) => void) | null = null;
let lastHudUpdate = 0;

export function useGameEngine(
  canvasRef: RefObject<HTMLCanvasElement>,
  handRef: RefObject<HandData>,
  skinColors: string[],
  settings: { gestureSensitivity: number; graphicsQuality: string; showMinimap: boolean; showFPS: boolean },
  onGameOver: (score: number, length: number, survivalMs: number, energyCollected: number, aiDefeated: number, powerUps: number, boosts: number, combo: number, coins: number) => void,
  onHudUpdate: (state: GameHUDState) => void,
) {
  const gsRef = useRef<GameState | null>(null);
  const loopRef = useRef<(ts: number) => void>(() => {});
  const rafRef  = useRef<number>(0);
  const prevTs  = useRef<number>(0);
  const fpsRef  = useRef<number>(0);
  const fpsCountRef = useRef<number>(0);
  const fpsTimeRef  = useRef<number>(0);
  hudCallbackFn = onHudUpdate;

  const startGame = useCallback(() => {
    if (!canvasRef.current) return;
    resetSmoothing();

    const env = pickEnvironment();
    const player = createPlayerSnake(skinColors);

    const aiSnakes: AISnakeState[] = Array.from({ length: AI_COUNT }, (_, i) => createAISnake(i));
    const orbs    = initOrbs();
    const powerUps = initPowerUps();
    const quests  = generateQuests();

    gsRef.current = {
      player, aiSnakes, orbs, powerUps,
      particles:   new ParticleSystem(),
      floatingTexts: [],
      quests,
      environment: env,
      decorations: generateDecorations(env, settings.graphicsQuality === 'low' ? 100 : 400),
      survivalMs: 0,
      energyCollected: 0,
      aiDefeated: 0,
      powerUpsCollected: 0,
      comboRecord: 1,
      coinsEarned: 0,
      scoreMultiplier: 1,
      orbRespawnTimer: 0,
      floatTextId: 0,
      slowMoTimer: 0,
      lastLeaderboard: [],
      freezeActive: false,
    };

    prevTs.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(ts => loopRef.current(ts));
  }, [canvasRef, skinColors, settings.graphicsQuality]);

  const stopGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Main game loop ──────────────────────────────────────────────────────────

  const gameLoop = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    const gs = gsRef.current;
    if (!canvas || !gs) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to window
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    const W = canvas.width, H = canvas.height;

    // Delta time (capped at 50ms to prevent spiral-of-death)
    const rawDt = prevTs.current ? Math.min(ts - prevTs.current, 50) : 16.67;
    prevTs.current = ts;

    // Slow-mo effect (freeze power-up)
    const dt = gs.freezeActive ? rawDt * 0.3 : rawDt;
    if (gs.slowMoTimer > 0) { gs.slowMoTimer -= rawDt; if (gs.slowMoTimer <= 0) gs.freezeActive = false; }

    // FPS tracking
    fpsCountRef.current++;
    fpsTimeRef.current += rawDt;
    if (fpsTimeRef.current >= 1000) {
      fpsRef.current = fpsCountRef.current;
      fpsCountRef.current = 0;
      fpsTimeRef.current = 0;
    }

    // ── Process gesture ──────────────────────────────────────────────────────
    const hand = handRef.current ?? { detected: false, isFist: false, palmX: 0.5, palmY: 0.5, wristX: 0.5, wristY: 0.5, isPinch: false, isOpen: false, landmarks: [] };
    const gesture = processGesture(hand, settings.gestureSensitivity);

    // ── Update player ─────────────────────────────────────────────────────────
    if (gs.player.alive) {
      const wasBoosting = gs.player.boosting;
      updatePlayerSnake(gs.player, gesture.dirX, gesture.dirY, gesture.magnitude, gesture.boosting, dt);

      if (gs.player.boosting && !wasBoosting) playBoost();

      // Boost trail particles
      if (gs.player.boosting && gs.player.segments.length > 0) {
        const head = gs.player.segments[0];
        gs.particles.emitBoost(head.x, head.y, skinColors[0], gs.player.angle);
      }

      // Survival score
      gs.survivalMs += dt;
      gs.player.score += (SCORE_PER_SECOND * dt) / 1000;

      // Camera
      const head = gs.player.segments[0];
      if (!('camera' in gs)) {
        (gs as any).camera = createCamera(head.x, head.y);
      }
      updateCamera((gs as any).camera, head.x, head.y, gs.player.angle, gs.player.length, W, H);
    }

    // Init camera if not yet
    if (!('camera' in gs) && gs.player.segments.length > 0) {
      const h = gs.player.segments[0];
      (gs as any).camera = createCamera(h.x, h.y);
    }
    const camera = (gs as any).camera ?? createCamera(3000, 3000);

    // ── Update AI ──────────────────────────────────────────────────────────────
    const aiUpdateStep = Math.max(1, Math.floor(gs.aiSnakes.length / 20));
    gs.aiSnakes.forEach((ai, i) => {
      if (!gs.freezeActive || i % 3 === 0) {
        updateAISnake(ai, gs.orbs, gs.player, gs.aiSnakes, dt);
      }
    });

    // ── Update orbs & power-ups ────────────────────────────────────────────────
    updateOrbs(gs.orbs, dt);
    gs.powerUps = updatePowerUps(gs.powerUps, dt);

    // Orb respawn
    gs.orbRespawnTimer -= dt;
    if (gs.orbRespawnTimer <= 0 && gs.orbs.length < ORB_COUNT) {
      gs.orbs.push(createOrb());
      gs.orbRespawnTimer = 500;
    }

    // Power-up respawn
    if (gs.powerUps.length < POWERUP_COUNT && Math.random() < 0.002 * (dt / 16.67)) {
      gs.powerUps.push(createPowerUp());
    }

    // ── Collisions ────────────────────────────────────────────────────────────
    if (gs.player.alive) {
      const events = runCollisions(gs.player, gs.aiSnakes, gs.orbs, gs.powerUps);

      // Orbs collected
      for (const orb of events.orbsCollected) {
        gs.orbs = gs.orbs.filter(o => o.id !== orb.id);
        const mult = gs.scoreMultiplier * (COMBO_MULTIPLIERS[Math.min(gs.player.combo - 1, COMBO_MULTIPLIERS.length - 1)] ?? 1);
        const pts = Math.round(orb.value * mult);
        gs.player.score += pts;
        gs.player.combo = Math.min(gs.player.combo + 1, COMBO_MULTIPLIERS.length);
        gs.player.comboTimer = COMBO_WINDOW_MS;
        gs.energyCollected++;
        const segments = 1 + (orb.color === 'gold' ? 3 : orb.color === 'rainbow' ? 8 : orb.color === 'purple' ? 2 : 0);
        growSnake(gs.player, segments);
        gs.particles.emitPickup(orb.x, orb.y, orb.color);
        addFloatingText(gs, orb.x, orb.y - 20, `+${pts}`, '#FFD740');
        playPickup(orb.color);
        if (gs.player.combo >= 3) {
          gs.particles.emitCombo(orb.x, orb.y, gs.player.combo);
          playCombo(gs.player.combo);
        }
        updateQuest(gs, 'collect_energy');
        gs.comboRecord = Math.max(gs.comboRecord, gs.player.combo);
      }

      // Power-ups collected
      for (const pu of events.powerUpsCollected) {
        gs.powerUps = gs.powerUps.filter(p => p.id !== pu.id);
        applyPowerUp(gs, pu.type);
        gs.particles.emitPowerUp(pu.x, pu.y, '#FFD740');
        addFloatingText(gs, pu.x, pu.y - 30, `${pu.type.toUpperCase().replace('_',' ')}!`, '#FFD740');
        playPowerUp();
        gs.powerUpsCollected++;
        updateQuest(gs, 'collect_powerups');
      }

      // AI killed
      for (const ai of events.aiKilled) {
        ai.alive = false;
        if (!ai.deathParticlesSent) {
          ai.deathParticlesSent = true;
          const orbs = spawnDroppedOrbs(ai.segments[0].x, ai.segments[0].y, ai.length);
          gs.orbs.push(...orbs.slice(0, ORB_COUNT - gs.orbs.length + orbs.length));
          gs.particles.emitExplosion(ai.segments[0].x, ai.segments[0].y, ai.skinColors, 80);
          gs.player.score += SCORE_PER_KILL;
          addFloatingText(gs, ai.segments[0].x, ai.segments[0].y - 40, `ELIMINATED! +${SCORE_PER_KILL}`, '#FF5252');
          gs.aiDefeated++;
          const killCoins = 20 + Math.floor(ai.length / 10);
          gs.coinsEarned += killCoins;
          updateQuest(gs, 'defeat_snakes');
          playKill();
        }
        // Respawn after delay
        setTimeout(() => { if (gs) respawnAISnake(ai, Math.floor(Math.random() * AI_COUNT)); }, 5000);
      }

      // Player died
      if (events.playerDied) {
        killPlayerSnake(gs.player);
        gs.particles.emitExplosion(gs.player.segments[0].x, gs.player.segments[0].y, skinColors, 150);
        playDeath();
        // Report game over after short delay (for death animation)
        setTimeout(() => {
          onGameOver(
            Math.floor(gs.player.score),
            gs.player.length,
            gs.survivalMs,
            gs.energyCollected,
            gs.aiDefeated,
            gs.powerUpsCollected,
            gs.player.boostsUsed,
            gs.comboRecord,
            gs.coinsEarned,
          );
        }, 1500);
      }
    }

    // ── Update quests ─────────────────────────────────────────────────────────
    updateQuestProgress(gs);

    // ── Particles & texts ─────────────────────────────────────────────────────
    gs.particles.update(dt);
    gs.floatingTexts = gs.floatingTexts
      .map(ft => ({ ...ft, y: ft.y + ft.vy * (dt / 16.67), alpha: ft.alpha - 0.012 * (dt / 16.67), life: ft.life - dt }))
      .filter(ft => ft.alpha > 0);

    // Ambient particles
    if (settings.graphicsQuality === 'high' && Math.random() < 0.2) {
      const cx = camera.x, cy = camera.y;
      gs.particles.emitAmbient(cx, cy, gs.environment.particleColor);
    }
    if (settings.graphicsQuality === 'high' && Math.random() < 0.05) {
      const cx = camera.x, cy = camera.y;
      gs.particles.emitFirefly(cx, cy);
    }

    // ── Leaderboard (update every 500ms) ─────────────────────────────────────
    if (ts - lastHudUpdate > 500) {
      gs.lastLeaderboard = buildLeaderboard(gs.player, gs.aiSnakes);
      lastHudUpdate = ts;
    }

    // ── Render ───────────────────────────────────────────────────────────────
    renderFrame(
      ctx, W, H, camera, gs.environment, gs.decorations,
      gs.orbs, gs.powerUps, gs.aiSnakes, gs.player, skinColors,
      gs.particles.getActive(), gs.floatingTexts, ts, settings.graphicsQuality,
    );

    // Minimap
    if (settings.showMinimap) {
      const mW = 160, mH = 160;
      renderMinimap(ctx, W - mW - 16, H - mH - 16, mW, mH,
        gs.player, gs.aiSnakes, gs.powerUps);
    }

    // FPS overlay
    if (settings.showFPS) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '12px monospace';
      ctx.fillText(`${fpsRef.current} FPS`, 8, H - 8);
    }

    // ── Emit HUD state ────────────────────────────────────────────────────────
    if (ts - lastHudUpdate > 100 && hudCallbackFn) {
      hudCallbackFn({
        score:        Math.floor(gs.player.score),
        length:       gs.player.length,
        combo:        gs.player.combo,
        boostCooldown: gs.player.boostCooldown,
        boostActive:  gs.player.boosting,
        survivalMs:   gs.survivalMs,
        aiAlive:      gs.aiSnakes.filter(a => a.alive).length,
        activePowerUps: gs.player.activePowerUps,
        quests:       gs.quests,
        leaderboard:  gs.lastLeaderboard,
        playerAlive:  gs.player.alive,
        speed:        gs.player.speed,
        handDetected: hand.detected,
      });
    }

    rafRef.current = requestAnimationFrame(ts => loopRef.current(ts));
  }, [canvasRef, handRef, skinColors, settings, onGameOver]);

  loopRef.current = gameLoop;

  useEffect(() => {
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  return { startGame, stopGame };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addFloatingText(gs: GameState, x: number, y: number, text: string, color: string): void {
  gs.floatingTexts.push({
    id: gs.floatTextId++,
    x, y, text, color,
    alpha: 1, vy: -0.8, life: 2000,
  });
}

function applyPowerUp(gs: GameState, type: string): void {
  const dur = getPowerUpDuration(type as any);
  addPowerUp(gs.player, { type: type as any, remaining: dur, total: dur });

  if (type === 'giant_energy') {
    growSnake(gs.player, 30);
  }
  if (type === 'double_score') {
    gs.scoreMultiplier = 2;
    setTimeout(() => { if (gs) gs.scoreMultiplier = 1; }, dur);
  }
  if (type === 'freeze') {
    gs.freezeActive = true;
    gs.slowMoTimer = dur;
  }
}

function generateQuests(): Quest[] {
  const picked: Quest[] = [];
  const shuffled = [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3);
  for (const tmpl of shuffled) {
    const target = tmpl.targets[Math.floor(Math.random() * tmpl.targets.length)];
    picked.push({
      id: tmpl.type + '_' + Math.random(),
      type: tmpl.type,
      description: tmpl.description.replace('{n}', String(target)),
      target,
      current: 0,
      reward: tmpl.reward,
      completed: false,
    });
  }
  return picked;
}

function updateQuest(gs: GameState, type: string): void {
  for (const q of gs.quests) {
    if (q.type === type && !q.completed) {
      q.current++;
      if (q.current >= q.target) {
        q.completed = true;
        gs.coinsEarned += q.reward;
        addFloatingText(gs, gs.player.segments[0]?.x ?? 3000, gs.player.segments[0]?.y ?? 3000 - 60, `QUEST COMPLETE! +${q.reward} coins`, '#FFD740');
      }
    }
  }
}

function updateQuestProgress(gs: GameState): void {
  for (const q of gs.quests) {
    if (q.completed) continue;
    if (q.type === 'reach_length') q.current = Math.floor(gs.player.length);
    if (q.type === 'survive_time') q.current = Math.floor(gs.survivalMs / 1000);
    if (q.type === 'use_boost') q.current = gs.player.boostsUsed;
    if (q.current >= q.target && !q.completed) {
      q.completed = true;
      gs.coinsEarned += q.reward;
    }
  }
}

function buildLeaderboard(player: PlayerSnakeState, aiSnakes: AISnakeState[]): LeaderEntry[] {
  const entries: LeaderEntry[] = [
    { name: 'YOU', score: Math.floor(player.score), length: player.length, isPlayer: true, alive: player.alive, rank: 0 },
    ...aiSnakes.map(ai => ({ name: ai.name, score: Math.floor(ai.score) + ai.length * 5, length: ai.length, isPlayer: false, alive: ai.alive, rank: 0 })),
  ];
  entries.sort((a, b) => b.score - a.score);
  entries.forEach((e, i) => { e.rank = i + 1; });
  return entries.slice(0, 10);
}
