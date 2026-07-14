import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { HandData } from '../gestures/useMediaPipe';
import { processGesture, resetGestureSmoothing } from '../gestures/gestureRecognizer';
import type {
  Level, SegmentSpec, GatePlacement, ObstaclePlacement, EnemyCrowdSpec,
  BossRuntimeState, BossDef, CastleRuntimeState, PowerUpPlacement, ActivePowerUp,
  FloatingText, EnvironmentDef, HudState, GameOverSummary,
} from '../types';
import {
  BASE_RUN_SPEED, PLAYER_FRONT_OFFSET, COLLISION_WINDOW, ENGAGE_SPAWN_AHEAD,
  INITIAL_CROWD_SIZE, TRACK_HALF_WIDTH, CHARGE_DURATION_MS, CHARGE_COOLDOWN_MS,
} from '../constants/gameConfig';
import { clamp, nextId, randomRange } from '../utils/mathUtils';

import { UnitPool } from '../game/entities/UnitPool';
import { SpatialGrid } from '../game/systems/SpatialGrid';
import { updateFlock, type CrowdAnchor } from '../game/systems/FlockingSystem';
import { reassignFormation, formationWidth } from '../game/systems/CrowdController';
import { updateGates, pruneGates } from '../game/systems/GateSystem';
import { updateObstacles, pruneObstacles, getAvoidZones } from '../game/systems/ObstacleSystem';
import {
  updatePowerUpPlacements, prunePowerUps, addActivePowerUp, tickActivePowerUps,
} from '../game/systems/PowerUpSystem';
import { tickCombat } from '../game/systems/CombatSystem';
import { createBossState, updateBoss, applyCrowdDamage } from '../game/systems/BossSystem';
import { createCastleState, applyCastleDamage, updateCastleCollapseAnim } from '../game/systems/CastleSystem';
import { createComboState, increment as comboIncrement, reset as comboReset, multiplierFor } from '../game/systems/ComboSystem';
import {
  createScoreBreakdown, addEnemyKill, addBossDefeat, addLevelComplete, addGateGrowth,
  type ScoreBreakdown,
} from '../game/systems/ScoringSystem';

import { applyGate } from '../game/gates/gateDefs';
import { randomPowerUpId } from '../game/powerups/powerupDefs';
import { BOSS_DEFS } from '../game/bosses/bossDefs';
import { getEnvironment } from '../game/environments/environmentDefs';
import { generateLevel } from '../game/level-gen/LevelGenerator';
import { ParticleSystem } from '../game/particles/ParticleSystem';
import { createCamera, updateCamera, toRelativeZ, type RunnerCamera } from '../game/camera/RunnerCamera';
import { setCanvasSize } from '../game/camera/projection';
import { renderScene } from '../game/rendering/SceneRenderer';
import { setMusicEnvironment } from '../game/audio/musicSystem';
import {
  initAudio, playPause, playChargeActivate, playGatePick, playObstacleHit,
  playCombatClash, playBossHit, playVictory, playCastleHit, playCastleCollapse,
  playDefeat, playPowerUp,
} from '../game/audio/audioSystem';

interface CosmeticSelection {
  colorIndex: number;
  hatId: string | null;
  capeId: string | null;
}

interface RunnerGameState {
  pool: UnitPool;
  grid: SpatialGrid;
  particles: ParticleSystem;
  camera: RunnerCamera;

  level: Level;
  env: EnvironmentDef;

  gates: GatePlacement[];
  obstacles: ObstaclePlacement[];
  enemyCrowdSpecs: EnemyCrowdSpec[];
  bossSpec: SegmentSpec['boss'] | null;
  castleSpec: SegmentSpec['castle'] | null;

  engagedEnemy: { spec: EnemyCrowdSpec; accumulator: { value: number } } | null;
  boss: BossRuntimeState | null;
  bossDef: BossDef | null;
  bossEngaged: boolean;
  castle: CastleRuntimeState | null;
  castleEngaged: boolean;
  levelAdvancePending: boolean;

  powerUps: PowerUpPlacement[];
  activePowerUps: ActivePowerUp[];
  powerUpSpawnTimer: number;

  floatingTexts: FloatingText[];
  floatTextId: number;

  playerLaneX: number;
  frozen: boolean;
  paused: boolean;

  chargeActive: boolean;
  chargeTimer: number;
  chargeCooldown: number;

  combo: ReturnType<typeof createComboState>;
  scoreBreakdown: ScoreBreakdown;

  levelIndex: number;
  distance: number;
  playerAlive: boolean;
}

function flattenLevel(level: Level) {
  const gates: GatePlacement[] = [];
  const obstacles: ObstaclePlacement[] = [];
  const enemyCrowdSpecs: EnemyCrowdSpec[] = [];
  let bossSpec: SegmentSpec['boss'] | null = null;
  let castleSpec: SegmentSpec['castle'] | null = null;
  for (const seg of level.segments) {
    if (seg.gates) gates.push(...seg.gates);
    if (seg.obstacles) obstacles.push(...seg.obstacles);
    if (seg.enemyCrowd) enemyCrowdSpecs.push(seg.enemyCrowd);
    if (seg.boss) bossSpec = seg.boss;
    if (seg.castle) castleSpec = seg.castle;
  }
  return { gates, obstacles, enemyCrowdSpecs, bossSpec, castleSpec };
}

function spawnFloatingText(gs: RunnerGameState, laneX: number, z: number, text: string, color: string): void {
  gs.floatingTexts.push({ id: gs.floatTextId++, laneX, depthZ: z, height: 0.3, text, color, life: 1200, maxLife: 1200 });
}

function applyPlayerCountDelta(gs: RunnerGameState, delta: number, spawnLaneX: number, spawnZ: number, cosmetics: CosmeticSelection): void {
  if (delta === 0) return;
  if (delta > 0) {
    for (let i = 0; i < delta; i++) {
      if (gs.pool.capacityRemaining() <= 0) break;
      const u = gs.pool.acquire('player', spawnLaneX, spawnZ, cosmetics.colorIndex);
      if (u) { u.hatId = cosmetics.hatId; u.capeId = cosmetics.capeId; }
    }
  } else {
    const toRemove = -delta;
    const sorted = gs.pool.getActive().filter((u) => u.team === 'player').slice().sort((a, b) => a.formationSlotZ - b.formationSlotZ);
    for (let i = 0; i < toRemove && i < sorted.length; i++) gs.pool.release(sorted[i]);
  }
  reassignFormation(gs.pool.getActive().filter((u) => u.team === 'player'));
}

function spawnEnemyCrowd(gs: RunnerGameState, spec: EnemyCrowdSpec): void {
  const count = Math.min(spec.count, gs.pool.capacityRemaining());
  for (let i = 0; i < count; i++) gs.pool.acquire('enemy', spec.laneX, spec.z, 1);
  reassignFormation(gs.pool.getActive().filter((u) => u.team === 'enemy'));
}

function buildHud(gs: RunnerGameState, handDetected: boolean): HudState {
  const playerCount = gs.pool.countActive('player');
  return {
    crowdCount: playerCount,
    coins: gs.scoreBreakdown.coins,
    levelIndex: gs.levelIndex,
    worldName: gs.env.name,
    score: Math.floor(gs.scoreBreakdown.score),
    combo: gs.combo.combo,
    comboMultiplier: multiplierFor(gs.combo.combo),
    chargeReady: gs.chargeCooldown <= 0 && !gs.chargeActive,
    chargeActive: gs.chargeActive,
    chargeCooldownMs: gs.chargeCooldown,
    chargeCooldownTotalMs: CHARGE_COOLDOWN_MS,
    paused: gs.paused,
    handDetected,
    activePowerUps: gs.activePowerUps,
    enemyCrowdCount: gs.engagedEnemy ? gs.pool.countActive('enemy') : null,
    bossHpPct: gs.boss ? gs.boss.hp / gs.boss.maxHp : null,
    bossName: gs.bossDef?.name ?? null,
    castleHpPct: gs.castle && !gs.castle.collapsed ? gs.castle.hp / gs.castle.maxHp : null,
    distance: Math.floor(gs.distance),
    segmentLabel: gs.bossEngaged ? 'Boss Fight' : gs.castleEngaged ? 'Castle Siege' : gs.engagedEnemy ? 'Crowd Clash' : 'Running',
    playerAlive: gs.playerAlive,
  };
}

function buildSummary(gs: RunnerGameState): GameOverSummary {
  return {
    score: Math.floor(gs.scoreBreakdown.score),
    levelsCompleted: gs.scoreBreakdown.levelsCompleted,
    highestCrowd: gs.pool.countActive('player'),
    bossesDefeated: gs.scoreBreakdown.bossesDefeated,
    enemiesDefeated: gs.scoreBreakdown.enemiesDefeated,
    distance: Math.floor(gs.distance),
    coinsEarned: gs.scoreBreakdown.coins,
    bestCombo: gs.combo.best,
  };
}

export function useGameEngine(
  canvasRef: RefObject<HTMLCanvasElement>,
  handRef: RefObject<HandData>,
  cosmetics: CosmeticSelection,
  settings: { gestureSensitivity: number; graphicsQuality: string },
  onGameOver: (summary: GameOverSummary) => void,
  onHudUpdate: (hud: HudState) => void,
) {
  const gsRef = useRef<RunnerGameState | null>(null);
  const loopRef = useRef<(ts: number) => void>(() => {});
  const rafRef = useRef<number>(0);
  const prevTs = useRef<number>(0);
  const lastHudRef = useRef<number>(0);

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;
  const onHudUpdateRef = useRef(onHudUpdate);
  onHudUpdateRef.current = onHudUpdate;
  const cosmeticsRef = useRef(cosmetics);
  cosmeticsRef.current = cosmetics;

  const startGame = useCallback(() => {
    if (!canvasRef.current) return;
    resetGestureSmoothing();
    initAudio();

    const level0 = generateLevel(0, 0);
    const flat = flattenLevel(level0);
    const env = getEnvironment(level0.worldId);
    setMusicEnvironment(env);

    const pool = new UnitPool();

    const gs: RunnerGameState = {
      pool, grid: new SpatialGrid(), particles: new ParticleSystem(), camera: createCamera(),
      level: level0, env,
      gates: flat.gates, obstacles: flat.obstacles, enemyCrowdSpecs: flat.enemyCrowdSpecs,
      bossSpec: flat.bossSpec, castleSpec: flat.castleSpec,
      engagedEnemy: null, boss: null, bossDef: null, bossEngaged: false,
      castle: null, castleEngaged: false, levelAdvancePending: false,
      powerUps: [], activePowerUps: [], powerUpSpawnTimer: 6000,
      floatingTexts: [], floatTextId: 0,
      playerLaneX: 0, frozen: false, paused: false,
      chargeActive: false, chargeTimer: 0, chargeCooldown: 0,
      combo: createComboState(), scoreBreakdown: createScoreBreakdown(),
      levelIndex: 0, distance: 0, playerAlive: true,
    };
    gsRef.current = gs;

    for (let i = 0; i < INITIAL_CROWD_SIZE; i++) {
      const u = pool.acquire('player', 0, PLAYER_FRONT_OFFSET, cosmeticsRef.current.colorIndex);
      if (u) { u.hatId = cosmeticsRef.current.hatId; u.capeId = cosmeticsRef.current.capeId; }
    }
    reassignFormation(pool.getActive().filter((u) => u.team === 'player'));

    prevTs.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame((ts) => loopRef.current(ts));
  }, [canvasRef]);

  const stopGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  const advanceLevel = useCallback((gs: RunnerGameState) => {
    gs.levelIndex += 1;
    const nextLevel = generateLevel(gs.levelIndex, gs.camera.depthOffset);
    const flat = flattenLevel(nextLevel);
    gs.level = nextLevel;
    gs.env = getEnvironment(nextLevel.worldId);
    setMusicEnvironment(gs.env);
    gs.gates = flat.gates;
    gs.obstacles = flat.obstacles;
    gs.enemyCrowdSpecs = flat.enemyCrowdSpecs;
    gs.bossSpec = flat.bossSpec;
    gs.castleSpec = flat.castleSpec;
    gs.boss = null; gs.bossDef = null; gs.bossEngaged = false;
    gs.castle = null; gs.castleEngaged = false;
    gs.engagedEnemy = null;
    gs.levelAdvancePending = false;
  }, []);

  const gameLoop = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    const gs = gsRef.current;
    if (!canvas || !gs) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    setCanvasSize(canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;

    const dt = prevTs.current ? Math.min(ts - prevTs.current, 50) : 16.67;
    prevTs.current = ts;

    const hand = handRef.current ?? { detected: false, palmX: 0.5, palmY: 0.5, wristX: 0.5, wristY: 0.5, isFist: false, isPinch: false, isOpen: false, confidence: 0, landmarks: [] };
    const gesture = processGesture(hand, settings.gestureSensitivity);

    if (gesture.pauseToggled && gs.playerAlive) {
      gs.paused = !gs.paused;
      playPause();
    }

    if (!gs.paused && gs.playerAlive) {
      // Charge mode
      if (gesture.chargeTriggered && !gs.chargeActive && gs.chargeCooldown <= 0) {
        gs.chargeActive = true;
        gs.chargeTimer = CHARGE_DURATION_MS;
        gs.chargeCooldown = CHARGE_COOLDOWN_MS;
        playChargeActivate();
      }
      if (gs.chargeActive) {
        gs.chargeTimer -= dt;
        if (gs.chargeTimer <= 0) { gs.chargeActive = false; gs.chargeTimer = 0; }
      } else if (gs.chargeCooldown > 0) {
        gs.chargeCooldown = Math.max(0, gs.chargeCooldown - dt);
      }

      if (gesture.detected) gs.playerLaneX = gesture.laneX;

      // Only freeze the camera once the crowd has actually closed the distance and is
      // in clash range — not merely because an enemy crowd has spawned somewhere ahead.
      const enemyInClashRange = !!gs.engagedEnemy
        && Math.abs(toRelativeZ(gs.camera, gs.engagedEnemy.spec.z) - PLAYER_FRONT_OFFSET) < COLLISION_WINDOW * 3;
      gs.frozen = enemyInClashRange || gs.bossEngaged || gs.castleEngaged;

      if (!gs.frozen) {
        const speed = BASE_RUN_SPEED * gs.level.difficulty.speedMultiplier * (gs.chargeActive ? 1.25 : 1);
        updateCamera(gs.camera, speed * (dt / 1000), dt);
        gs.distance += speed * (dt / 1000);
      } else {
        updateCamera(gs.camera, 0, dt);
      }

      const playerCountForWidth = gs.pool.countActive('player');
      const crowdHalfWidth = formationWidth(playerCountForWidth) / 2;
      const anchor: CrowdAnchor = {
        laneX: clamp(gs.playerLaneX, -TRACK_HALF_WIDTH + crowdHalfWidth * 0.4, TRACK_HALF_WIDTH - crowdHalfWidth * 0.4),
        z: gs.camera.depthOffset + PLAYER_FRONT_OFFSET,
      };

      gs.grid.clear();
      const allActive = gs.pool.getActive();
      for (const u of allActive) gs.grid.insert(u);
      const playerUnits = allActive.filter((u) => u.team === 'player');
      const enemyUnits = allActive.filter((u) => u.team === 'enemy');

      const avoidZones = gs.frozen ? [] : getAvoidZones(gs.obstacles, gs.camera);
      updateFlock(playerUnits, gs.grid, anchor, dt, avoidZones);
      if (gs.engagedEnemy) {
        const spec = gs.engagedEnemy.spec;
        updateFlock(enemyUnits, gs.grid, { laneX: spec.laneX, z: spec.z }, dt, []);
      }

      // ── Gates ──
      if (!gs.frozen) {
        const gateEvents = updateGates(gs.gates, gs.camera, anchor.laneX, crowdHalfWidth);
        for (const ev of gateEvents) {
          if (ev.missed || !ev.chosen || !ev.def) {
            comboReset(gs.combo);
            continue;
          }
          const before = gs.pool.countActive('player');
          const after = applyGate(before, ev.def);
          applyPlayerCountDelta(gs, after - before, ev.chosen.laneX, ev.chosen.z, cosmeticsRef.current);
          comboIncrement(gs.combo);
          addGateGrowth(gs.scoreBreakdown, after - before, multiplierFor(gs.combo.combo));
          gs.particles.emitGateBurst(ev.chosen.laneX, ev.chosen.z, ev.def.color);
          spawnFloatingText(gs, ev.chosen.laneX, ev.chosen.z, ev.def.label, ev.def.color);
          playGatePick(ev.def.op);
        }

        const hits = updateObstacles(gs.obstacles, gs.camera, anchor.laneX, crowdHalfWidth, gs.chargeActive, dt);
        for (const hit of hits) {
          applyPlayerCountDelta(gs, -hit.crowdDamage, hit.obstacle.laneX, hit.obstacle.z, cosmeticsRef.current);
          gs.scoreBreakdown.tookDamageThisLevel = true;
          comboReset(gs.combo);
          gs.particles.emitObstacleHit(hit.obstacle.laneX, hit.obstacle.z, gs.env.obstacleAccent);
          spawnFloatingText(gs, hit.obstacle.laneX, hit.obstacle.z, `-${hit.crowdDamage}`, '#F87171');
          playObstacleHit();
        }
        gs.obstacles = pruneObstacles(gs.obstacles, gs.camera);
        gs.gates = pruneGates(gs.gates, gs.camera);
      }

      // ── Power-ups ──
      gs.powerUpSpawnTimer -= dt;
      if (gs.powerUpSpawnTimer <= 0) {
        gs.powerUpSpawnTimer = 7000 + Math.random() * 5000;
        const laneX = randomRange(-TRACK_HALF_WIDTH * 0.6, TRACK_HALF_WIDTH * 0.6);
        const z = gs.camera.depthOffset + PLAYER_FRONT_OFFSET + 20;
        gs.powerUps.push({ id: nextId(), powerUpDefId: randomPowerUpId(), laneX, z, collected: false });
      }
      const puEvents = updatePowerUpPlacements(gs.powerUps, gs.camera, anchor.laneX, crowdHalfWidth);
      for (const ev of puEvents) {
        gs.particles.emitPowerUpBurst(anchor.laneX, anchor.z, ev.def.color);
        playPowerUp();
        if (ev.def.kind === 'megaCrowd') {
          const before = gs.pool.countActive('player');
          applyPlayerCountDelta(gs, before, anchor.laneX, anchor.z, cosmeticsRef.current);
        } else {
          addActivePowerUp(gs.activePowerUps, ev.def);
        }
      }
      gs.powerUps = prunePowerUps(gs.powerUps, gs.camera);
      tickActivePowerUps(gs.activePowerUps, dt);

      // ── Enemy crowd engagement ──
      if (!gs.engagedEnemy) {
        const spec = gs.enemyCrowdSpecs.find((s) => {
          if (s.resolved) return false;
          const relZ = toRelativeZ(gs.camera, s.z);
          return relZ < ENGAGE_SPAWN_AHEAD && relZ > -4;
        });
        if (spec && gs.pool.countActive('enemy') === 0) {
          spawnEnemyCrowd(gs, spec);
          gs.engagedEnemy = { spec, accumulator: { value: 0 } };
        }
      }
      if (gs.engagedEnemy) {
        const spec = gs.engagedEnemy.spec;
        const relZ = toRelativeZ(gs.camera, spec.z);
        if (Math.abs(relZ - PLAYER_FRONT_OFFSET) < COLLISION_WINDOW * 3) {
          const result = tickCombat(gs.pool, dt, gs.engagedEnemy.accumulator, gs.chargeActive);
          if (result.enemyKilled > 0 || result.playerKilled > 0) {
            gs.particles.emitCombatClash(anchor.laneX, spec.z);
            if (Math.random() < 0.25) playCombatClash();
          }
          if (result.enemyKilled > 0) {
            for (let i = 0; i < result.enemyKilled; i++) addEnemyKill(gs.scoreBreakdown, multiplierFor(gs.combo.combo));
            comboIncrement(gs.combo, result.enemyKilled);
          }
          if (result.resolved === 'enemy-empty') {
            spec.resolved = true;
            gs.engagedEnemy = null;
            spawnFloatingText(gs, spec.laneX, spec.z, 'VICTORY!', '#4ADE80');
          } else if (result.resolved === 'player-empty') {
            gs.engagedEnemy = null;
          }
        }
      }

      // ── Boss ──
      if (!gs.boss && gs.bossSpec) {
        const relZ = toRelativeZ(gs.camera, gs.bossSpec.z);
        if (relZ < ENGAGE_SPAWN_AHEAD && relZ > -4) {
          const def = BOSS_DEFS[gs.bossSpec.bossDefId] ?? null;
          gs.bossDef = def;
          if (def) gs.boss = createBossState(def, gs.level.difficulty, gs.bossSpec.laneX, gs.bossSpec.z);
        }
      }
      if (gs.boss && gs.bossDef && !gs.boss.defeated) {
        const relZ = toRelativeZ(gs.camera, gs.boss.z);
        gs.bossEngaged = Math.abs(relZ - PLAYER_FRONT_OFFSET) < COLLISION_WINDOW * 3;
        if (gs.bossEngaged) {
          const events = updateBoss(gs.boss, gs.bossDef, dt);
          if (events.attackResolved) {
            applyPlayerCountDelta(gs, -events.attackResolved.damage, gs.boss.laneX, gs.boss.z, cosmeticsRef.current);
            gs.scoreBreakdown.tookDamageThisLevel = true;
            gs.particles.emitBossTelegraph(gs.boss.laneX, gs.boss.z, gs.bossDef.accentColor);
            playBossHit();
          }
          if (events.summonCount > 0) {
            spawnEnemyCrowd(gs, { id: nextId(), count: events.summonCount, archetype: 'basic', z: gs.boss.z + 1, laneX: gs.boss.laneX, resolved: false });
          }
          const playerCount = gs.pool.countActive('player');
          const defeated = applyCrowdDamage(gs.boss, playerCount, dt, gs.chargeActive);
          if (defeated) {
            gs.bossEngaged = false;
            addBossDefeat(gs.scoreBreakdown);
            spawnFloatingText(gs, gs.boss.laneX, gs.boss.z, 'BOSS DEFEATED!', '#FACC15');
            playVictory();
          }
        }
      } else {
        gs.bossEngaged = false;
      }

      // ── Castle ──
      if (!gs.castle && gs.castleSpec) {
        const relZ = toRelativeZ(gs.camera, gs.castleSpec.z);
        if (relZ < ENGAGE_SPAWN_AHEAD && relZ > -4) {
          gs.castle = createCastleState(gs.castleSpec.hp, gs.castleSpec.z);
        }
      }
      if (gs.castle && !gs.castle.collapsed) {
        const relZ = toRelativeZ(gs.camera, gs.castle.z);
        gs.castleEngaged = Math.abs(relZ - PLAYER_FRONT_OFFSET) < COLLISION_WINDOW * 4;
        if (gs.castleEngaged) {
          const playerCount = gs.pool.countActive('player');
          const collapsed = applyCastleDamage(gs.castle, playerCount, dt, gs.chargeActive);
          if (Math.random() < 0.05) playCastleHit();
          if (collapsed) {
            playCastleCollapse();
            gs.particles.emitCastleCollapse(0, gs.castle.z, gs.env.castleColor);
            addLevelComplete(gs.scoreBreakdown, multiplierFor(gs.combo.combo));
          }
        }
      } else if (gs.castle?.collapsed) {
        gs.castleEngaged = false;
        updateCastleCollapseAnim(gs.castle, dt);
        if (gs.castle.collapseTimer > 1200 && !gs.levelAdvancePending) {
          gs.levelAdvancePending = true;
          advanceLevel(gs);
        }
      }

      // ── Player death check ──
      const playerCountNow = gs.pool.countActive('player');
      if (playerCountNow <= 0 && gs.playerAlive) {
        gs.playerAlive = false;
        playDefeat();
        const summary = buildSummary(gs);
        setTimeout(() => onGameOverRef.current(summary), 1200);
      }

      gs.particles.update(dt);
      for (let i = gs.floatingTexts.length - 1; i >= 0; i--) {
        const ft = gs.floatingTexts[i];
        ft.height += dt * 0.0006;
        ft.life -= dt;
        if (ft.life <= 0) gs.floatingTexts.splice(i, 1);
      }
    }

    const renderActive = gs.pool.getActive();
    renderScene(ctx, W, H, {
      env: gs.env,
      camera: gs.camera,
      playerUnits: renderActive.filter((u) => u.team === 'player'),
      enemyUnits: renderActive.filter((u) => u.team === 'enemy'),
      obstacles: gs.obstacles,
      gates: gs.gates,
      powerUps: gs.powerUps,
      boss: gs.boss,
      bossDef: gs.bossDef,
      castle: gs.castle,
      particles: gs.particles.getActive(),
      floatingTexts: gs.floatingTexts,
      chargeActive: gs.chargeActive,
      t: ts,
    });

    if (ts - lastHudRef.current > 100) {
      lastHudRef.current = ts;
      onHudUpdateRef.current(buildHud(gs, hand.detected));
    }

    rafRef.current = requestAnimationFrame((t) => loopRef.current(t));
  }, [canvasRef, handRef, settings, advanceLevel]);

  loopRef.current = gameLoop;

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const setPaused = useCallback((paused: boolean) => {
    const gs = gsRef.current;
    if (gs) gs.paused = paused;
  }, []);

  return { startGame, stopGame, setPaused };
}
