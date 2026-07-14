import type {
  StickFigureUnit, ObstaclePlacement, GatePlacement, PowerUpPlacement,
  BossRuntimeState, BossDef, CastleRuntimeState, EnvironmentDef, FloatingText,
} from '../../types';
import type { Particle } from '../particles/ParticleSystem';
import { project } from '../camera/projection';
import { type RunnerCamera, toRelativeZ } from '../camera/RunnerCamera';
import { drawObstacle } from '../obstacles/ObstacleRenderer';
import { drawGate } from '../gates/GateRenderer';
import { drawStickFigure } from './StickFigureRenderer';
import { drawBoss } from '../bosses/BossRenderer';
import { POWERUP_DEFS } from '../powerups/powerupDefs';
import { TRACK_HALF_WIDTH, MAX_VIEW_DEPTH } from '../../constants/gameConfig';

interface RenderItem { relZ: number; draw: () => void; }

export interface SceneInput {
  env: EnvironmentDef;
  camera: RunnerCamera;
  playerUnits: StickFigureUnit[];
  enemyUnits: StickFigureUnit[];
  obstacles: ObstaclePlacement[];
  gates: GatePlacement[];
  powerUps: PowerUpPlacement[];
  boss: BossRuntimeState | null;
  bossDef: BossDef | null;
  castle: CastleRuntimeState | null;
  particles: Particle[];
  floatingTexts: FloatingText[];
  chargeActive: boolean;
  t: number;
}

export function renderScene(ctx: CanvasRenderingContext2D, w: number, h: number, input: SceneInput): void {
  const { env, camera } = input;

  drawSky(ctx, w, h, env);
  drawGround(ctx, w, h, camera, env);

  const items: RenderItem[] = [];

  for (const g of input.gates) {
    if (g.resolved) continue;
    items.push({ relZ: toRelativeZ(camera, g.z), draw: () => drawGate(ctx, g, camera, input.t) });
  }
  for (const o of input.obstacles) {
    if (o.destroyed) continue;
    items.push({ relZ: toRelativeZ(camera, o.z), draw: () => drawObstacle(ctx, o, camera, env.obstacleAccent) });
  }
  for (const pu of input.powerUps) {
    if (pu.collected) continue;
    items.push({ relZ: toRelativeZ(camera, pu.z), draw: () => drawPowerUp(ctx, pu, camera, input.t) });
  }
  for (const u of input.playerUnits) {
    items.push({ relZ: toRelativeZ(camera, u.depthZ), draw: () => drawStickFigure(ctx, u, camera, input.chargeActive) });
  }
  for (const u of input.enemyUnits) {
    items.push({ relZ: toRelativeZ(camera, u.depthZ), draw: () => drawStickFigure(ctx, u, camera, false) });
  }
  if (input.boss && input.bossDef && !input.boss.defeated) {
    const boss = input.boss, bossDef = input.bossDef;
    items.push({ relZ: toRelativeZ(camera, boss.z), draw: () => drawBoss(ctx, boss, bossDef, camera, input.t) });
  }
  if (input.castle) {
    const castle = input.castle;
    items.push({ relZ: toRelativeZ(camera, castle.z), draw: () => drawCastle(ctx, castle, camera, env) });
  }
  for (const p of input.particles) {
    items.push({ relZ: toRelativeZ(camera, p.depthZ), draw: () => drawParticle(ctx, p, camera) });
  }

  items.sort((a, b) => b.relZ - a.relZ);
  for (const it of items) it.draw();

  for (const ft of input.floatingTexts) drawFloatingText(ctx, ft, camera);
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, env: EnvironmentDef): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  grad.addColorStop(0, env.skyTop);
  grad.addColorStop(1, env.skyBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, camera: RunnerCamera, env: EnvironmentDef): void {
  const horizonY = project(0, MAX_VIEW_DEPTH, 0).y;
  ctx.fillStyle = env.groundColor;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // Lane guide lines receding into the distance
  ctx.strokeStyle = env.groundLineColor;
  ctx.lineWidth = 2;
  const laneCount = 5;
  for (let i = 0; i <= laneCount; i++) {
    const laneX = -TRACK_HALF_WIDTH + (i / laneCount) * TRACK_HALF_WIDTH * 2;
    const near = project(laneX, 0.5, 0);
    const far = project(laneX, MAX_VIEW_DEPTH, 0);
    ctx.beginPath();
    ctx.moveTo(near.x, near.y);
    ctx.lineTo(far.x, far.y);
    ctx.stroke();
  }
  // Cross-ties for a sense of forward motion
  const scroll = camera.depthOffset % 3;
  for (let z = -scroll; z < MAX_VIEW_DEPTH; z += 3) {
    const l = project(-TRACK_HALF_WIDTH, z, 0);
    const r = project(TRACK_HALF_WIDTH, z, 0);
    ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r.x, r.y); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Distance fog
  const fog = ctx.createLinearGradient(0, horizonY, 0, horizonY + 120);
  fog.addColorStop(0, env.fogColor);
  fog.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, horizonY, w, 120);
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUpPlacement, camera: RunnerCamera, t: number): void {
  const def = POWERUP_DEFS[pu.powerUpDefId];
  if (!def) return;
  const relZ = toRelativeZ(camera, pu.z);
  if (relZ < -2 || relZ > 40) return;
  const bob = Math.sin(t / 260 + pu.id) * 0.08;
  const p = project(pu.laneX, relZ, 0.35 + bob);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.scale, p.scale);
  ctx.fillStyle = def.color;
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#0b0e1a';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(def.label[0], 0, 1);
  ctx.restore();
}

function drawCastle(ctx: CanvasRenderingContext2D, castle: CastleRuntimeState, camera: RunnerCamera, env: EnvironmentDef): void {
  const relZ = toRelativeZ(camera, castle.z);
  if (relZ < -4 || relZ > 44) return;
  const p = project(0, relZ, 0);
  const shake = castle.collapsed ? Math.sin(castle.collapseTimer / 20) * 6 * Math.max(0, 1 - castle.collapseTimer / 800) : 0;
  const sink = castle.collapsed ? Math.min(1, castle.collapseTimer / 900) : 0;

  ctx.save();
  ctx.translate(p.x + shake, p.y + sink * 140);
  ctx.scale(p.scale, p.scale);
  ctx.globalAlpha = 1 - sink * 0.7;

  ctx.fillStyle = env.castleColor;
  ctx.fillRect(-120, -260, 240, 260);
  for (let i = -100; i <= 100; i += 40) {
    ctx.fillRect(i - 10, -280, 20, 24);
  }
  ctx.fillStyle = '#5B4636';
  ctx.fillRect(-30, -90, 60, 90);

  if (!castle.collapsed) {
    const hpPct = Math.max(0, castle.hp / castle.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-100, -320, 200, 16);
    ctx.fillStyle = '#F87171';
    ctx.fillRect(-100, -320, 200 * hpPct, 16);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(-100, -320, 200, 16);
  }

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, camera: RunnerCamera): void {
  const relZ = toRelativeZ(camera, p.depthZ);
  if (relZ < -3 || relZ > 44) return;
  const pt = project(p.laneX, relZ, p.height);
  const alpha = Math.max(0, p.life / p.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, Math.max(1, p.size * pt.scale), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFloatingText(ctx: CanvasRenderingContext2D, ft: FloatingText, camera: RunnerCamera): void {
  const relZ = toRelativeZ(camera, ft.depthZ);
  if (relZ < -3 || relZ > 44) return;
  const p = project(ft.laneX, relZ, ft.height);
  const alpha = Math.max(0, ft.life / ft.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ft.color;
  ctx.font = `bold ${Math.max(12, 26 * p.scale)}px 'Baloo 2', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(ft.text, p.x, p.y);
  ctx.restore();
}
