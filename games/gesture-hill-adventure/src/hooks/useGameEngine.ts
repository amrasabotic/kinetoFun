/**
 * useGameEngine — the main game loop hook.
 *
 * Coordinates:
 *   Matter.js physics engine
 *   Gesture input (via handRef)
 *   Terrain generation / cleanup
 *   Collectibles
 *   Particle system
 *   Stunt detection
 *   Camera
 *   Canvas rendering
 *   Score / fuel / crash logic
 *
 * Returns liveStats (for React HUD) and control functions.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import Matter from 'matter-js';

import type { HandData, Vehicle, Coin, FuelCan, Particle, FloatingText, Camera, LiveStats, VehicleSkin } from '../types';
import { ENVIRONMENTS, getEnvironmentIndex } from '../game/environments/environments';
import { createTerrainChunk, cleanupTerrain, getTerrainY, getDifficulty } from '../game/terrain/terrainGenerator';
import { createCamera, updateCamera } from '../game/camera/cameraSystem';
import { createVehicle, driveVehicle, destroyVehicle } from '../game/physics/vehiclePhysics';
import { drawVehicle, getExhaustPoint, getBoostPoint } from '../game/vehicle/vehicleRenderer';
import {
  emitDust, emitSmoke, emitBoostFlame, emitCoinSparkle, emitFuelGlow,
  emitExplosion, emitLandingDirt, emitAmbient, updateParticles, renderParticles,
} from '../game/particles/particleSystem';
import {
  generateCollectiblesAhead, checkCollections, cleanupCollectibles,
  renderCoins, renderFuelCans,
} from '../game/collectibles/collectibles';
import {
  createStuntDetector, updateStuntDetector, isInvertCrash,
  updateFloatingTexts, renderFloatingTexts, spawnScoreText,
} from '../game/stuntDetector';
import { createGestureRecognizer } from '../gestures/gestureRecognizer';
import {
  initAudio, updateEngineSound, stopEngineSound,
  playCoin, playFuel, playBoost, playCrash, playLanding,
} from '../game/audio/audioSystem';
import { finaliseRun } from '../stores/useGameStore';
import type { TerrainChunk } from '../types';
import {
  GRAVITY, TERRAIN_VISIBLE_AHEAD, TERRAIN_BASE_Y,
  FUEL_MAX, FUEL_DRAIN_PER_SEC, FUEL_DRAIN_BOOST, FUEL_RESTORE,
  SCORE_PER_METER, MAX_VEHICLE_SPEED, BOOST_COOLDOWN_MS,
  COMBO_TIMEOUT_MS, COMBO_MAX, WHEEL_R,
} from '../constants/gameConfig';

const { Engine, Runner } = Matter;

const INITIAL_X   = 250;
const INITIAL_Y   = TERRAIN_BASE_Y - 120;
const TERRAIN_SEG = 600;

// ── Internal mutable game state (all in one ref — never triggers re-renders) ──

interface GS {
  engine:       Matter.Engine;
  vehicle:      Vehicle;
  terrainChunks: TerrainChunk[];
  coins:        Coin[];
  fuelCans:     FuelCan[];
  particles:    Particle[];
  floatingTexts: FloatingText[];
  camera:       Camera;

  score:        number;
  coinCount:    number;
  fuel:         number;
  distance:     number;
  speed:        number;
  combo:        number;
  comboTimer:   number;
  totalFlips:   number;
  totalAirTime: number;
  fuelPickups:  number;
  sessionMs:    number;
  crashed:      boolean;
  crashTimer:   number;

  envIndex:     number;
  seed:         number;
  difficulty:   number;

  lastGenX:     number;   // furthest X for which collectibles are placed
  nextTerrainEnd: number; // furthest X for which terrain exists

  stuntState: ReturnType<typeof createStuntDetector>;
  gesture:    ReturnType<typeof createGestureRecognizer>;

  lastDustMs: number;
  lastSmokeMs: number;
  wasAirborne: boolean;
  gameTime:   number;   // ms since run start
}

export interface UseGameEngineReturn {
  liveStats:  LiveStats;
  startGame:  () => void;
  stopGame:   () => void;
  pauseGame:  () => void;
  resumeGame: () => void;
  isRunning:  boolean;
}

export function useGameEngine(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  handRef:   React.MutableRefObject<HandData>,
  skin:      VehicleSkin,
  settings:  { gestureSensitivity: number; sound: boolean; music: boolean; graphicsQuality: string },
  onGameOver: () => void,
): UseGameEngineReturn {
  const gsRef    = useRef<GS | null>(null);
  const rafId    = useRef(0);
  const lastTs   = useRef(0);
  const paused   = useRef(false);
  const running  = useRef(false);

  const [liveStats, setLiveStats] = useState<LiveStats>({
    distance: 0, score: 0, coinCount: 0, fuel: FUEL_MAX, speed: 0,
    combo: 0, airTime: 0, gesture: 'neutral',
    boostReady: true, boostCooldownFrac: 0,
    environment: ENVIRONMENTS[0].name,
  });

  const [isRunning, setIsRunning] = useState(false);

  // ── Build a fresh game state ────────────────────────────────────────────────
  const buildGameState = useCallback((): GS => {
    const engine = Engine.create({
      gravity: { x: 0, y: GRAVITY, scale: 1 },
    });

    const seed       = Math.random() * 1000;
    const difficulty = 0;
    const camera     = createCamera(INITIAL_X + 300, INITIAL_Y);
    const vehicle    = createVehicle(engine.world, INITIAL_X, INITIAL_Y);

    // Bootstrap terrain
    const terrainChunks: TerrainChunk[] = [];
    let   startX = 0;
    while (startX < INITIAL_X + TERRAIN_VISIBLE_AHEAD) {
      const endX = startX + TERRAIN_SEG;
      terrainChunks.push(createTerrainChunk(engine.world, startX, endX, seed, difficulty));
      startX = endX;
    }

    return {
      engine,
      vehicle,
      terrainChunks,
      coins:    [],
      fuelCans: [],
      particles: [],
      floatingTexts: [],
      camera,
      score:    0,
      coinCount: 0,
      fuel:     FUEL_MAX,
      distance: 0,
      speed:    0,
      combo:    0,
      comboTimer: 0,
      totalFlips: 0,
      totalAirTime: 0,
      fuelPickups: 0,
      sessionMs: 0,
      crashed:  false,
      crashTimer: 0,
      envIndex: 0,
      seed,
      difficulty,
      lastGenX:       INITIAL_X,
      nextTerrainEnd: startX,
      stuntState: createStuntDetector(),
      gesture:    createGestureRecognizer(),
      lastDustMs:  0,
      lastSmokeMs: 0,
      wasAirborne: false,
      gameTime:   0,
    };
  }, []);

  // ── Rendering ───────────────────────────────────────────────────────────────
  const render = useCallback((gs: GS) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const { camera, vehicle, envIndex } = gs;
    const env = ENVIRONMENTS[envIndex];

    ctx.clearRect(0, 0, W, H);

    // ── 1. Sky gradient (fullscreen, no camera) ───────────────────────────────
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, env.skyTop);
    sky.addColorStop(1, env.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Sun / moon ─────────────────────────────────────────────────────────
    const sunX = W * 0.82;
    const sunY = H * 0.12;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
    sunGlow.addColorStop(0, env.sunColor);
    sunGlow.addColorStop(0.4, env.sunColor);
    sunGlow.addColorStop(1,  'rgba(0,0,0,0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = env.sunColor;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fill();

    // ── 3. Parallax mountains ─────────────────────────────────────────────────
    const mOffset = -camera.x * 0.08;
    ctx.fillStyle = env.mountainColor;
    for (let i = 0; i < 5; i++) {
      const mx = ((mOffset + i * 340) % (W + 340)) - 170;
      ctx.beginPath();
      ctx.moveTo(mx, H);
      ctx.lineTo(mx + 170, H * 0.32);
      ctx.lineTo(mx + 340, H);
      ctx.closePath();
      ctx.fill();
    }

    // ── 4. Clouds ─────────────────────────────────────────────────────────────
    const cOffset = -camera.x * 0.05;
    ctx.fillStyle = env.cloudColor;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 4; i++) {
      const cx2 = ((cOffset + i * 360 + 60) % (W + 200)) - 100;
      const cy2 = H * 0.12 + i * 18;
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.arc(cx2 + j * 30, cy2, 22 - j * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // ── 5. World-space drawing (camera transform) ─────────────────────────────
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // ── 5a. Parallax trees ────────────────────────────────────────────────────
    if (settings.graphicsQuality !== 'low') {
      renderParallaxTrees(ctx, gs, camera.x, W, H);
    }

    // ── 5b. Terrain ────────────────────────────────────────────────────────────
    renderTerrain(ctx, gs, W, H);

    // ── 5c. Collectibles ──────────────────────────────────────────────────────
    renderCoins(ctx, gs.coins, gs.gameTime);
    renderFuelCans(ctx, gs.fuelCans, gs.gameTime);

    // ── 5d. Particles (world) ─────────────────────────────────────────────────
    renderParticles(ctx, gs.particles);

    // ── 5e. Vehicle ───────────────────────────────────────────────────────────
    drawVehicle(ctx, vehicle, skin);

    // ── 5f. Floating texts ────────────────────────────────────────────────────
    renderFloatingTexts(ctx, gs.floatingTexts);

    ctx.restore();

    // ── 6. HUD (screen space) ─────────────────────────────────────────────────
    renderHUD(ctx, gs, W, H);
  }, [canvasRef, skin, settings.graphicsQuality]);

  // ── Terrain rendering ───────────────────────────────────────────────────────
  function renderTerrain(
    ctx: CanvasRenderingContext2D, gs: GS, _W: number, _H: number,
  ): void {
    const env = ENVIRONMENTS[gs.envIndex];
    for (const chunk of gs.terrainChunks) {
      if (chunk.points.length < 2) continue;

      const pts = chunk.points;
      const groundY = TERRAIN_BASE_Y + 600;

      // Fill area below surface
      ctx.beginPath();
      ctx.moveTo(pts[0].x, groundY);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(pts[pts.length - 1].x, groundY);
      ctx.closePath();
      ctx.fillStyle = env.terrainFill;
      ctx.fill();

      // Surface top strip (brighter grass / snow / rock)
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = env.terrainSurface;
      ctx.lineWidth   = 6;
      ctx.lineJoin    = 'round';
      ctx.stroke();

      // Thin outline
      ctx.strokeStyle = env.terrainStroke;
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Lava environment glow at the bottom
      if (env.hasLava) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + 8);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y + 8);
        ctx.strokeStyle = 'rgba(255,80,0,0.6)';
        ctx.lineWidth   = 4;
        ctx.stroke();
      }
    }
  }

  // ── Parallax trees ──────────────────────────────────────────────────────────
  function renderParallaxTrees(
    ctx: CanvasRenderingContext2D, gs: GS, camX: number, W: number, _H: number,
  ): void {
    const env     = ENVIRONMENTS[gs.envIndex];
    const spacing = 220;
    const viewW   = W / gs.camera.zoom;
    const startX  = Math.floor((camX - viewW) / spacing) * spacing;

    for (let tx = startX; tx < camX + viewW; tx += spacing) {
      const groundY = getTerrainY(gs.terrainChunks, tx + gs.seed * 0.1);
      // Skip if ground not loaded
      if (groundY === TERRAIN_BASE_Y && gs.terrainChunks.length === 0) continue;

      if (env.hasCactus) {
        drawCactus(ctx, tx, groundY, env);
      } else if (env.hasCandy) {
        drawCandyPole(ctx, tx, groundY, env);
      } else {
        drawTree(ctx, tx, groundY - 4, env);
      }
    }
  }

  function drawTree(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    env: typeof ENVIRONMENTS[0],
  ): void {
    const h = 55 + Math.sin(x * 0.1) * 15;
    ctx.fillStyle = env.treeTrunkColor;
    ctx.fillRect(x - 5, y - h * 0.35, 10, h * 0.35);
    ctx.fillStyle = env.treeColor;
    ctx.beginPath();
    ctx.arc(x, y - h * 0.45, h * 0.42, 0, Math.PI * 2);
    ctx.fill();
    if (env.hasSnow) {
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y - h * 0.55, h * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCactus(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    env: typeof ENVIRONMENTS[0],
  ): void {
    ctx.fillStyle = env.treeColor;
    ctx.fillRect(x - 6, y - 55, 12, 55);
    ctx.fillRect(x - 22, y - 40, 16, 10);
    ctx.fillRect(x + 6,  y - 48, 16, 10);
    ctx.fillRect(x - 22, y - 55, 10, 16);
    ctx.fillRect(x + 12, y - 60, 10, 13);
  }

  function drawCandyPole(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    env: typeof ENVIRONMENTS[0],
  ): void {
    ctx.strokeStyle = env.accentColor;
    ctx.lineWidth   = 8;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 60);
    ctx.stroke();
    ctx.fillStyle = env.treeColor;
    ctx.beginPath();
    ctx.arc(x, y - 65, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── HUD rendering (screen space) ────────────────────────────────────────────
  function renderHUD(
    ctx: CanvasRenderingContext2D, gs: GS, W: number, H: number,
  ): void {
    const pad = 18;
    const env = ENVIRONMENTS[gs.envIndex];

    // ── Panel helpers ─────────────────────────────────────────────────────────
    function hudPanel(x: number, y: number, w: number, h: number, r = 12): void {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D).roundRect(x, y, w, h, r);
      ctx.fill();
    }

    // ── Top Left: Distance / Score / Coins ───────────────────────────────────
    hudPanel(pad, pad, 200, 90);
    ctx.fillStyle = '#FFFFFF';
    ctx.font      = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📏 ${Math.floor(gs.distance)}m`, pad + 12, pad + 24);
    ctx.fillText(`⭐ ${gs.score.toLocaleString()}`, pad + 12, pad + 46);
    ctx.fillText(`🪙 ${gs.coinCount}`, pad + 12, pad + 68);

    // ── Top Right: High score / Combo ─────────────────────────────────────────
    hudPanel(W - pad - 180, pad, 180, 60);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFE878';
    ctx.fillText(`COMBO ×${gs.combo}`, W - pad - 12, pad + 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`ENV: ${env.emoji} ${env.name}`, W - pad - 12, pad + 48);

    // ── Fuel gauge (bottom right) ─────────────────────────────────────────────
    const fuelX = W - pad - 160, fuelY = H - pad - 80;
    hudPanel(fuelX, fuelY, 160, 70, 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.font      = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ FUEL', fuelX + 12, fuelY + 22);

    const fuelFrac = gs.fuel / FUEL_MAX;
    const fuelBarW = 136, fuelBarH = 14;
    const fuelBarX = fuelX + 12, fuelBarY = fuelY + 32;

    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(fuelBarX, fuelBarY, fuelBarW, fuelBarH, 7);
    ctx.fill();

    // Fill
    const fuelColor = fuelFrac > 0.5 ? '#00E676' : fuelFrac > 0.25 ? '#FFD600' : '#FF5252';
    ctx.fillStyle   = fuelColor;
    ctx.shadowColor = fuelColor;
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    ctx.roundRect(fuelBarX, fuelBarY, fuelBarW * fuelFrac, fuelBarH, 7);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FFFFFF';
    ctx.font      = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.ceil(gs.fuel)}%`, fuelX + 148, fuelY + 62);

    // ── Boost indicator (next to fuel) ────────────────────────────────────────
    const gState = gs.gesture.state;
    const boostX = fuelX - 64, boostY = fuelY + 10;
    const boostReady = gState.boostCooldownMs === 0;

    ctx.fillStyle  = boostReady ? '#FF6D00' : 'rgba(255,255,255,0.25)';
    ctx.shadowColor = boostReady ? '#FF3D00' : 'transparent';
    ctx.shadowBlur  = boostReady ? 8 : 0;
    ctx.font        = '26px sans-serif';
    ctx.textAlign   = 'center';
    ctx.fillText('🚀', boostX, boostY + 26);
    ctx.shadowBlur  = 0;

    if (!boostReady) {
      const frac = gState.boostCooldownMs / 5000;
      ctx.strokeStyle = '#FF6D00';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.arc(boostX, boostY + 14, 20, -Math.PI / 2, -Math.PI / 2 + (1 - frac) * Math.PI * 2);
      ctx.stroke();
    }

    // ── Gesture indicator (bottom left) ──────────────────────────────────────
    const gType  = gState.type;
    const gIcons: Record<string, string> = {
      neutral:    '✋ Neutral',
      accelerate: '⬆️ Accelerate',
      brake:      '⬇️ Brake',
      boost:      '🚀 BOOST!',
      reverse:    '◀️ Reverse',
    };
    const gLabel = gIcons[gType] ?? '✋';
    hudPanel(pad, H - pad - 44, 180, 40, 8);
    ctx.fillStyle = gType === 'boost' ? '#FF6D00' : gType === 'accelerate' ? '#69F0AE' : '#FFFFFF';
    ctx.font      = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(gLabel, pad + 12, H - pad - 18);

    // ── Speed (bottom center) ─────────────────────────────────────────────────
    const speedKmh = Math.round(gs.speed * 0.06);
    ctx.fillStyle   = '#FFFFFF';
    ctx.font        = 'bold 18px sans-serif';
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur  = 4;
    ctx.fillText(`${speedKmh} km/h`, W / 2, H - pad - 10);
    ctx.shadowBlur  = 0;

    // ── Crash warning ─────────────────────────────────────────────────────────
    if (gs.crashed) {
      const alpha = Math.min(1, gs.crashTimer / 800);
      ctx.fillStyle = `rgba(255,50,50,${alpha * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── Resize canvas to window ─────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [canvasRef]);

  // Store loop callback in a ref to avoid stale closure / circular deps
  const loopRef = useRef<(ts: number) => void>(null!);

  // ── Main game loop ──────────────────────────────────────────────────────────
  const gameLoop = useCallback((ts: number) => {
    if (!running.current) return;
    const dt = Math.min(ts - (lastTs.current || ts), 50);
    lastTs.current = ts;

    const gs = gsRef.current;
    if (!gs) { rafId.current = requestAnimationFrame(gameLoop); return; }

    if (paused.current) {
      render(gs);
      rafId.current = requestAnimationFrame(gameLoop);
      return;
    }

    gs.gameTime  += dt;
    gs.sessionMs += dt;

    // ── 1. Gesture input ───────────────────────────────────────────────────
    const hand    = handRef.current;
    const gesture = gs.gesture.update(hand, dt, settings.gestureSensitivity);

    // ── 2. Physics step ────────────────────────────────────────────────────
    Engine.update(gs.engine, dt);

    // ── 3. Drive vehicle ───────────────────────────────────────────────────
    driveVehicle(gs.vehicle, gesture.throttle, gesture.boostActive, MAX_VEHICLE_SPEED);

    // ── 4. Update position data ────────────────────────────────────────────
    const vx       = gs.vehicle.chassis.velocity.x;
    const vy       = gs.vehicle.chassis.velocity.y;
    gs.speed       = Math.hypot(vx, vy) * 60; // px/s
    gs.distance    = Math.max(gs.distance, (gs.vehicle.chassis.position.x - INITIAL_X) / 4);
    gs.difficulty  = getDifficulty(gs.distance);

    // ── 5. Fuel drain ──────────────────────────────────────────────────────
    const drainRate = gesture.boostActive ? FUEL_DRAIN_BOOST : FUEL_DRAIN_PER_SEC;
    gs.fuel = Math.max(0, gs.fuel - drainRate * (dt / 1000));

    if (gs.fuel <= 0 && !gs.crashed) {
      triggerCrash(gs, 'fuel');
    }

    // ── 6. Score from distance ─────────────────────────────────────────────
    gs.score += SCORE_PER_METER * (gs.speed / 60) * (dt / 1000);

    // ── 7. Stunt detection ─────────────────────────────────────────────────
    const terrainYUnder = getTerrainY(
      gs.terrainChunks,
      gs.vehicle.chassis.position.x,
    );

    updateStuntDetector(
      gs.stuntState,
      gs.vehicle,
      terrainYUnder,
      dt,
      gs.floatingTexts,
      (pts) => {
        gs.score += pts;
        gs.combo  = Math.min(gs.combo + 1, COMBO_MAX);
        gs.comboTimer = COMBO_TIMEOUT_MS;
      },
      () => { gs.totalFlips++; gs.stuntState.totalFlips++; },
    );

    // Combo timer
    if (gs.combo > 0) {
      gs.comboTimer -= dt;
      if (gs.comboTimer <= 0) gs.combo = 0;
    }

    // Landing sound
    if (gs.stuntState.landed) {
      playLanding();
    }

    // Airborne tracking
    gs.wasAirborne = gs.stuntState.isAirborne;

    // Inversion crash
    if (isInvertCrash(gs.stuntState) && !gs.crashed) {
      triggerCrash(gs, 'flip');
    }

    // Fell off a cliff — chassis more than 500 px below the terrain at its X
    if (!gs.crashed && gs.vehicle.chassis.position.y > terrainYUnder + 500) {
      triggerCrash(gs, 'pit');
    }

    // ── 8. Collectibles ────────────────────────────────────────────────────
    const coll = checkCollections(gs.coins, gs.fuelCans, gs.vehicle, gs.gameTime);
    if (coll.coinsCollected > 0) {
      gs.coinCount += coll.coinsCollected;
      gs.score     += coll.scoreGained;
      playCoin();
      emitCoinSparkle(
        gs.particles,
        gs.vehicle.chassis.position.x,
        gs.vehicle.chassis.position.y - 30,
      );
    }
    if (coll.fuelPickups > 0) {
      gs.fuel = Math.min(FUEL_MAX, gs.fuel + coll.fuelRestored);
      gs.fuelPickups += coll.fuelPickups;
      playFuel();
      emitFuelGlow(
        gs.particles,
        gs.vehicle.chassis.position.x,
        gs.vehicle.chassis.position.y,
      );
    }

    // Cleanup collected + far-behind
    const cl = cleanupCollectibles(gs.coins, gs.fuelCans, gs.camera.x, 800);
    gs.coins    = cl.coins;
    gs.fuelCans = cl.fuelCans;

    // ── 9. Generate new terrain and collectibles ────────────────────────────
    const genAhead = gs.vehicle.chassis.position.x + TERRAIN_VISIBLE_AHEAD;
    while (gs.nextTerrainEnd < genAhead) {
      const seg = createTerrainChunk(
        gs.engine.world,
        gs.nextTerrainEnd,
        gs.nextTerrainEnd + TERRAIN_SEG,
        gs.seed, gs.difficulty,
      );
      gs.terrainChunks.push(seg);
      gs.nextTerrainEnd += TERRAIN_SEG;
    }

    gs.lastGenX = generateCollectiblesAhead(
      gs.coins, gs.fuelCans,
      genAhead, gs.lastGenX,
      gs.seed, gs.difficulty,
    );

    gs.terrainChunks = cleanupTerrain(
      gs.engine.world, gs.terrainChunks, gs.camera.x, 1200,
    );

    // ── 10. Environment ────────────────────────────────────────────────────
    gs.envIndex = getEnvironmentIndex(gs.distance);

    // ── 11. Particles ──────────────────────────────────────────────────────
    const exhaustPt = getExhaustPoint(gs.vehicle);

    // Dust from wheels on ground
    if (!gs.stuntState.isAirborne && Math.abs(vx) > 0.5) {
      if (gs.gameTime - gs.lastDustMs > 40) {
        gs.lastDustMs = gs.gameTime;
        const env = ENVIRONMENTS[gs.envIndex];
        emitDust(
          gs.particles,
          gs.vehicle.rearWheel.position.x,
          gs.vehicle.rearWheel.position.y + WHEEL_R,
          vx * 60, env.ambientColor,
        );
      }
    }

    // Exhaust smoke
    if (gs.gameTime - gs.lastSmokeMs > 120) {
      gs.lastSmokeMs = gs.gameTime;
      emitSmoke(gs.particles, exhaustPt.x, exhaustPt.y);
    }

    // Boost flames
    if (gesture.boostActive) {
      const bp = getBoostPoint(gs.vehicle);
      emitBoostFlame(gs.particles, bp.x, bp.y, gs.vehicle.chassis.angle);
    }

    // Ambient environment particles
    if (ENVIRONMENTS[gs.envIndex].hasSnow && gs.particles.filter(p => p.type === 'ambient').length < 40) {
      emitAmbient(gs.particles,
        gs.camera.x + (Math.random() - 0.5) * 600,
        gs.camera.y - 200,
        '#FFFFFF', 'ambient',
      );
    }

    updateParticles(gs.particles, dt);

    // ── 12. Floating texts ────────────────────────────────────────────────
    updateFloatingTexts(gs.floatingTexts, dt);

    // ── 13. Camera ────────────────────────────────────────────────────────
    updateCamera(gs.camera, gs.vehicle, gs.speed, dt);

    // ── 14. Engine sound ──────────────────────────────────────────────────
    updateEngineSound(gs.speed / 60, gesture.throttle);

    // ── 15. Crash handling ────────────────────────────────────────────────
    if (gs.crashed) {
      gs.crashTimer += dt;
      if (gs.crashTimer > 2200) {
        doGameOver(gs);
        return;
      }
    }

    // ── 16. React state update (every ~100 ms to avoid flooding) ─────────
    if (Math.floor(gs.gameTime / 100) !== Math.floor((gs.gameTime - dt) / 100)) {
      setLiveStats({
        distance:    gs.distance,
        score:       Math.floor(gs.score),
        coinCount:   gs.coinCount,
        fuel:        gs.fuel,
        speed:       gs.speed,
        combo:       gs.combo,
        airTime:     gs.stuntState.airTimeMs / 1000,
        gesture:     gesture.type,
        boostReady:  gesture.boostCooldownMs === 0,
        boostCooldownFrac: gesture.boostCooldownMs / BOOST_COOLDOWN_MS,
        environment: ENVIRONMENTS[gs.envIndex].name,
      });
    }

    // ── 17. Render ────────────────────────────────────────────────────────
    render(gs);

    rafId.current = requestAnimationFrame(ts => loopRef.current(ts));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handRef, settings, render]);

  // ── Crash trigger ───────────────────────────────────────────────────────────
  function triggerCrash(gs: GS, _reason: 'fuel' | 'flip' | 'pit'): void {
    if (gs.crashed) return;
    gs.crashed = true;
    playCrash();
    emitExplosion(
      gs.particles,
      gs.vehicle.chassis.position.x,
      gs.vehicle.chassis.position.y,
    );
  }

  function doGameOver(gs: GS): void {
    stopEngineSound();
    cancelAnimationFrame(rafId.current);
    running.current = false;
    setIsRunning(false);

    finaliseRun(
      gs.distance,
      Math.floor(gs.score),
      gs.coinCount,
      gs.stuntState.totalFlips,
      gs.fuelPickups,
      gs.stuntState.totalAirTime,
      gs.sessionMs / 1000,
    );
    onGameOver();
  }

  // ── Public controls ─────────────────────────────────────────────────────────
  // Keep loopRef up to date every render
  loopRef.current = gameLoop;

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    stopEngineSound();
    initAudio();

    const gs = buildGameState();
    if (gsRef.current) destroyVehicle(gsRef.current.engine.world, gsRef.current.vehicle);
    gsRef.current  = gs;
    lastTs.current = 0;
    paused.current = false;
    running.current = true;
    setIsRunning(true);

    rafId.current = requestAnimationFrame(ts => loopRef.current(ts));
  }, [buildGameState, gameLoop]);

  const stopGame = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    stopEngineSound();
    running.current = false;
    setIsRunning(false);
  }, []);

  const pauseGame  = useCallback(() => { paused.current = true; }, []);
  const resumeGame = useCallback(() => {
    paused.current = false;
    lastTs.current = 0;
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(rafId.current);
    stopEngineSound();
    running.current = false;
  }, []);

  return { liveStats, startGame, stopGame, pauseGame, resumeGame, isRunning };
}

// ── Tiny type helpers (not exported from matter-js directly) ──────────────────
declare module 'matter-js' {
  interface IBodyDefinition { label?: string; }
}

