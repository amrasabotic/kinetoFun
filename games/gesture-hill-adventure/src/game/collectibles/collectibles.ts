/**
 * Coin and fuel-can placement and rendering.
 * No physics bodies — simple distance-based collection checks.
 */
import type { Coin, FuelCan, Vehicle } from '../../types';
import {
  COIN_SCORE, COIN_INTERVAL, COIN_CLUSTER_SIZE,
  COIN_PICKUP_RADIUS, COIN_R,
  FUEL_PICKUP_RADIUS, FUEL_CAN_W, FUEL_CAN_H, FUEL_CAN_INTERVAL,
  FUEL_RESTORE,
} from '../../constants/gameConfig';
import { terrainY } from '../terrain/terrainGenerator';

let nextId = 0;

// ── Placement ─────────────────────────────────────────────────────────────────

export function spawnCoinsAtX(
  coins: Coin[],
  worldX: number,
  seed: number,
  difficulty: number,
): void {
  const count   = COIN_CLUSTER_SIZE + Math.floor(difficulty);
  const baseY   = terrainY(worldX, seed, difficulty);
  const spacing = 36;

  for (let i = 0; i < count; i++) {
    const x = worldX + i * spacing;
    const y = baseY - 60 - Math.random() * 40;  // above terrain
    coins.push({
      id:        nextId++,
      x,
      y,
      collected: false,
      spinAngle: Math.random() * Math.PI * 2,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }
}

export function spawnFuelCan(
  fuelCans: FuelCan[],
  worldX: number,
  seed: number,
  difficulty: number,
): void {
  const y = terrainY(worldX, seed, difficulty) - FUEL_CAN_H - 20;
  fuelCans.push({
    id:        nextId++,
    x:         worldX,
    y,
    collected: false,
    glow:      0,
  });
}

// ── Seeded generation: spawn items based on distance ─────────────────────────

export function generateCollectiblesAhead(
  coins:      Coin[],
  fuelCans:   FuelCan[],
  upToX:      number,
  lastGenX:   number,
  seed:       number,
  difficulty: number,
): number {
  let x = lastGenX;
  while (x < upToX) {
    x += COIN_INTERVAL + Math.random() * 60;
    if (coins.length < 200) {
      spawnCoinsAtX(coins, x, seed, difficulty);
    }
    // Fuel cans are sparser
    if (Math.abs(Math.round(x / FUEL_CAN_INTERVAL) * FUEL_CAN_INTERVAL - x) < COIN_INTERVAL) {
      if (fuelCans.length < 20) {
        spawnFuelCan(fuelCans, x + FUEL_CAN_INTERVAL * 0.5, seed, difficulty);
      }
    }
  }
  return x;
}

// ── Collection ────────────────────────────────────────────────────────────────

interface CollectionResult {
  coinsCollected: number;
  scoreGained:    number;
  fuelRestored:   number;
  fuelPickups:    number;
}

export function checkCollections(
  coins:    Coin[],
  fuelCans: FuelCan[],
  vehicle:  Vehicle,
  time:     number,
): CollectionResult {
  const cx = vehicle.chassis.position.x;
  const cy = vehicle.chassis.position.y;
  let coinsCollected = 0;
  let scoreGained    = 0;
  let fuelRestored   = 0;
  let fuelPickups    = 0;

  for (const coin of coins) {
    if (coin.collected) continue;
    const dist = Math.hypot(cx - coin.x, cy - coin.y);
    if (dist < COIN_PICKUP_RADIUS) {
      coin.collected = true;
      coinsCollected++;
      scoreGained += COIN_SCORE;
    }
    // Animate
    coin.spinAngle += 0.06;
    coin.bobOffset += 0.02;
  }

  for (const can of fuelCans) {
    if (can.collected) continue;
    const dist = Math.hypot(cx - can.x, cy - can.y);
    if (dist < FUEL_PICKUP_RADIUS) {
      can.collected = true;
      fuelRestored += FUEL_RESTORE;
      fuelPickups++;
    }
    // Pulse glow
    can.glow = (Math.sin(time * 0.004 + can.id) + 1) / 2;
  }

  return { coinsCollected, scoreGained, fuelRestored, fuelPickups };
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function cleanupCollectibles(
  coins:    Coin[],
  fuelCans: FuelCan[],
  cameraX:  number,
  keepBehind: number,
): { coins: Coin[]; fuelCans: FuelCan[] } {
  const cutX = cameraX - keepBehind;
  return {
    coins:    coins.filter(c    => c.x > cutX || !c.collected),
    fuelCans: fuelCans.filter(f => f.x > cutX || !f.collected),
  };
}

// ── Rendering ─────────────────────────────────────────────────────────────────

export function renderCoins(
  ctx:   CanvasRenderingContext2D,
  coins: Coin[],
  time:  number,
): void {
  for (const coin of coins) {
    if (coin.collected) continue;
    const bob = Math.sin(time * 0.003 + coin.bobOffset) * 5;
    const y   = coin.y + bob;

    ctx.save();
    ctx.translate(coin.x, y);

    // Glow
    ctx.shadowColor = '#FFE878';
    ctx.shadowBlur  = 10;

    // Coin body (oval for 3D spin effect)
    const scaleX = Math.abs(Math.cos(coin.spinAngle));
    ctx.scale(scaleX, 1);
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#FF8F00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, COIN_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // $ symbol
    ctx.scale(1 / (scaleX || 0.01), 1);  // undo scale for text
    if (scaleX > 0.3) {
      ctx.fillStyle   = '#FF8F00';
      ctx.font        = `bold ${COIN_R}px sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

export function renderFuelCans(
  ctx:      CanvasRenderingContext2D,
  fuelCans: FuelCan[],
  time:     number,
): void {
  for (const can of fuelCans) {
    if (can.collected) continue;
    const bob  = Math.sin(time * 0.0025 + can.id) * 4;
    const glow = (Math.sin(time * 0.004 + can.id) + 1) / 2;

    ctx.save();
    ctx.translate(can.x, can.y + bob);

    // Glow aura
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur  = 10 + glow * 12;

    const w = FUEL_CAN_W, h = FUEL_CAN_H;

    // Can body
    ctx.fillStyle = '#00BCD4';
    ctx.strokeStyle = '#006064';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // Nozzle
    ctx.fillStyle = '#006064';
    ctx.fillRect(-4, -h / 2 - 8, 8, 10);
    ctx.fillRect(0, -h / 2 - 10, 12, 4);

    // ⚡ icon
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${w - 4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 2);

    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}
