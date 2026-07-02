import type { BossDef, BossRuntimeState } from '../../types';
import { project } from '../camera/projection';
import { type RunnerCamera, toRelativeZ } from '../camera/RunnerCamera';

/** Generic boss renderer driven entirely by BossDef data — no per-boss special-case draw code. */
export function drawBoss(
  ctx: CanvasRenderingContext2D,
  state: BossRuntimeState,
  def: BossDef,
  camera: RunnerCamera,
  t: number,
): void {
  if (state.defeated) return;
  const relZ = toRelativeZ(camera, state.z);
  if (relZ < -3 || relZ > 44) return;

  const p = project(state.laneX, relZ, 0);
  const scale = p.scale;
  const bob = Math.sin(t / 260) * 6;

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(scale, scale);

  if (state.hitFlash > 0) {
    ctx.filter = 'brightness(1.8)';
  }

  // Telegraph ring
  if (state.telegraphing) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 90);
    ctx.strokeStyle = `rgba(255, 80, 80, ${0.4 + pulse * 0.4})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -60, 90 + pulse * 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Body — a big blocky stick figure, size communicates "boss"
  ctx.strokeStyle = def.color;
  ctx.fillStyle = def.color;
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(0, -30); ctx.lineTo(-40, 60);
  ctx.moveTo(0, -30); ctx.lineTo(40, 60);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -30); ctx.lineTo(0, -130);
  ctx.stroke();

  ctx.strokeStyle = def.accentColor;
  ctx.beginPath();
  ctx.moveTo(0, -110); ctx.lineTo(-60, -60);
  ctx.moveTo(0, -110); ctx.lineTo(60, -60);
  ctx.stroke();

  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(0, -160, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.filter = 'none';

  // HP bar above head
  const hpPct = Math.max(0, state.hp / state.maxHp);
  const barW = 140;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(-barW / 2, -220, barW, 14);
  ctx.fillStyle = def.accentColor;
  ctx.fillRect(-barW / 2, -220, barW * hpPct, 14);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.strokeRect(-barW / 2, -220, barW, 14);

  ctx.restore();
}
