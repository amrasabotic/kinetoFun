/**
 * Canvas drawing functions for the cartoon buggy vehicle.
 * All drawing is purely in canvas 2D — no images needed.
 */
import type { Vehicle, VehicleSkin, Particle } from '../../types';
import { WHEEL_R, CHASSIS_W, CHASSIS_H } from '../../constants/gameConfig';

// ── Wheel ─────────────────────────────────────────────────────────────────────

function drawWheel(
  ctx:    CanvasRenderingContext2D,
  x:      number,
  y:      number,
  angle:  number,
  skin:   VehicleSkin,
): void {
  ctx.save();
  ctx.translate(x, y);

  // Shadow under wheel
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur  = 6;
  ctx.shadowOffsetY = 4;

  // Tyre (outer)
  ctx.fillStyle = skin.wheelColor;
  ctx.beginPath();
  ctx.arc(0, 0, WHEEL_R, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Tyre tread pattern (dark ring)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth   = 5;
  ctx.beginPath();
  ctx.arc(0, 0, WHEEL_R - 3, 0, Math.PI * 2);
  ctx.stroke();

  // Rim (rotates with wheel)
  ctx.rotate(angle);
  ctx.fillStyle = skin.rimColor;
  ctx.beginPath();
  ctx.arc(0, 0, WHEEL_R * 0.56, 0, Math.PI * 2);
  ctx.fill();

  // Rim spokes
  ctx.strokeStyle = skin.rimColor;
  ctx.lineWidth   = 3;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * WHEEL_R * 0.82, Math.sin(a) * WHEEL_R * 0.82);
    ctx.stroke();
  }

  // Centre hub
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Chassis / Body ────────────────────────────────────────────────────────────

function drawChassis(
  ctx:    CanvasRenderingContext2D,
  skin:   VehicleSkin,
): void {
  const w = CHASSIS_W;
  const h = CHASSIS_H;
  const r = 10; // corner radius

  // ── Body shell ─────────────────────────────────────────────────────────────
  ctx.shadowColor   = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur    = 10;
  ctx.shadowOffsetY = 6;

  ctx.fillStyle = skin.bodyColor;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.fill();

  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Body highlight
  const bodyGrad = ctx.createLinearGradient(-w / 2, -h / 2, -w / 2, h / 2);
  bodyGrad.addColorStop(0,   'rgba(255,255,255,0.22)');
  bodyGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
  bodyGrad.addColorStop(1,   'rgba(0,0,0,0.15)');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.fill();

  // Body outline
  ctx.strokeStyle = skin.cabinColor;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.stroke();

  // ── Cabin / roof ───────────────────────────────────────────────────────────
  const cabinX = -w * 0.18;
  const cabinW =  w * 0.50;
  const cabinH =  h * 0.75;
  const cabinY = -h / 2 - cabinH + 4;

  ctx.fillStyle = skin.cabinColor;
  ctx.beginPath();
  ctx.roundRect(cabinX, cabinY, cabinW, cabinH, [8, 8, 0, 0]);
  ctx.fill();

  // Cabin window
  ctx.fillStyle = 'rgba(150,220,255,0.6)';
  ctx.beginPath();
  ctx.roundRect(cabinX + 5, cabinY + 5, cabinW - 10, cabinH - 12, [6, 6, 0, 0]);
  ctx.fill();

  // Window glare
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(cabinX + cabinW * 0.28, cabinY + cabinH * 0.28, cabinW * 0.18, cabinH * 0.14, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // ── Headlights ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#FFFF88';
  ctx.shadowColor = '#FFFF00';
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.ellipse(w / 2 - 6, 0, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Taillight ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#FF3300';
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur  = 5;
  ctx.beginPath();
  ctx.ellipse(-w / 2 + 5, 0, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Exhaust pipe ───────────────────────────────────────────────────────────
  ctx.strokeStyle = skin.exhaustColor;
  ctx.lineWidth   = 5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, h / 2 - 6);
  ctx.lineTo(-w / 2 - 14, h / 2 - 2);
  ctx.stroke();

  // ── Accent stripe ──────────────────────────────────────────────────────────
  ctx.strokeStyle = skin.accentColor;
  ctx.lineWidth   = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 12, 0);
  ctx.lineTo( w / 2 - 15, 0);
  ctx.stroke();

  // ── Mud guards ─────────────────────────────────────────────────────────────
  ctx.fillStyle = skin.cabinColor;
  // Rear
  ctx.beginPath();
  ctx.arc(-CHASSIS_W * 0.38, CHASSIS_H / 2, WHEEL_R * 0.95, Math.PI, 0);
  ctx.fill();
  // Front
  ctx.beginPath();
  ctx.arc( CHASSIS_W * 0.38, CHASSIS_H / 2, WHEEL_R * 0.95, Math.PI, 0);
  ctx.fill();
}

// ── Suspension spring visual ──────────────────────────────────────────────────

function drawSuspension(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number,
  bx: number, by: number,
): void {
  ctx.strokeStyle = 'rgba(180,180,180,0.6)';
  ctx.lineWidth   = 2;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── Main draw function ────────────────────────────────────────────────────────

export function drawVehicle(
  ctx:    CanvasRenderingContext2D,
  vehicle: Vehicle,
  skin:    VehicleSkin,
): void {
  const { chassis, rearWheel, frontWheel } = vehicle;

  // ── Wheels (drawn under chassis) ──────────────────────────────────────────
  drawWheel(ctx, rearWheel.position.x,  rearWheel.position.y,  rearWheel.angle,  skin);
  drawWheel(ctx, frontWheel.position.x, frontWheel.position.y, frontWheel.angle, skin);

  // ── Suspension lines ─────────────────────────────────────────────────────
  const cx    = chassis.position.x;
  const cy    = chassis.position.y;
  const angle = chassis.angle;
  const rearX  = cx + Math.cos(angle) * (-CHASSIS_W / 2 + 10) + Math.sin(angle) * (CHASSIS_H / 2);
  const rearY  = cy + Math.sin(angle) * (-CHASSIS_W / 2 + 10) - Math.cos(angle) * (CHASSIS_H / 2);
  const frontX = cx + Math.cos(angle) * ( CHASSIS_W / 2 - 10) + Math.sin(angle) * (CHASSIS_H / 2);
  const frontY = cy + Math.sin(angle) * ( CHASSIS_W / 2 - 10) - Math.cos(angle) * (CHASSIS_H / 2);

  drawSuspension(ctx, rearX,  rearY,  rearWheel.position.x,  rearWheel.position.y);
  drawSuspension(ctx, frontX, frontY, frontWheel.position.x, frontWheel.position.y);

  // ── Chassis ──────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(chassis.position.x, chassis.position.y);
  ctx.rotate(chassis.angle);
  drawChassis(ctx, skin);
  ctx.restore();
}

// ── Exhaust smoke spawn point (world coords) ──────────────────────────────────

export function getExhaustPoint(vehicle: Vehicle): { x: number; y: number } {
  const { chassis } = vehicle;
  const a = chassis.angle;
  const ox = -CHASSIS_W / 2 - 14;
  const oy = CHASSIS_H / 2 - 2;
  return {
    x: chassis.position.x + Math.cos(a) * ox - Math.sin(a) * oy,
    y: chassis.position.y + Math.sin(a) * ox + Math.cos(a) * oy,
  };
}

/** Returns the point behind the chassis for boost flame emission. */
export function getBoostPoint(vehicle: Vehicle): { x: number; y: number } {
  const { chassis } = vehicle;
  const a = chassis.angle;
  return {
    x: chassis.position.x - Math.cos(a) * (CHASSIS_W / 2 + 10),
    y: chassis.position.y - Math.sin(a) * (CHASSIS_W / 2 + 10),
  };
}
