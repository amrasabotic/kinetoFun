import type { Collectible, Enemy, Maze, Player } from '../types/GameTypes';
import * as audio from './audio';
import type { ParticleSystem } from './ParticleSystem';
import type { ScoreSystem } from './ScoreSystem';

export const COLLECT_RADIUS = 0.42;
export const ENEMY_HIT_RADIUS = 0.55;
export const INVULNERABLE_MS = 2000;
export const POWER_MODE_MS = 8000;
export const FRIGHTENED_SPEED_MULT = 0.55;
export const EATEN_SPEED_MULT = 2.4;

export interface CollisionEvents {
  onPowerModeStart: () => void;
  onPlayerHit: () => void;
  onLifeLost: (livesRemaining: number) => void;
  onOrbsDepleted: () => void;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function checkCollectibles(
  player: Player,
  maze: Maze,
  score: ScoreSystem,
  particles: ParticleSystem,
  toScreen: (col: number, row: number) => { x: number; y: number },
  events: CollisionEvents,
): void {
  let remaining = 0;
  for (const c of maze.collectibles) {
    if (c.collected) continue;
    remaining++;
    if (dist(player.col, player.row, c.col, c.row) > COLLECT_RADIUS) continue;
    c.collected = true;
    remaining--;
    const screenPos = toScreen(c.col, c.row);
    collectOne(c, score, particles, screenPos, maze, events);
  }
  if (remaining === 0) events.onOrbsDepleted();
}

function collectOne(
  c: Collectible,
  score: ScoreSystem,
  particles: ParticleSystem,
  screenPos: { x: number; y: number },
  maze: Maze,
  events: CollisionEvents,
): void {
  switch (c.kind) {
    case 'orb':
      score.addPoints(10);
      audio.playOrb(score.streak);
      particles.burstOrb(screenPos.x, screenPos.y, maze.theme.pathColor);
      break;
    case 'power':
      score.addPoints(50);
      audio.playPowerOrb();
      particles.burstPower(screenPos.x, screenPos.y, maze.theme.accent);
      events.onPowerModeStart();
      break;
    case 'gem':
      score.addPoints(100);
      audio.playGem();
      particles.burstPower(screenPos.x, screenPos.y, '#ffd23f');
      break;
    case 'treasure':
      score.addPoints(500);
      audio.playTreasure();
      particles.burstPower(screenPos.x, screenPos.y, '#ff2ecb');
      break;
  }
}

export function checkEnemyCollisions(
  player: Player,
  enemies: Enemy[],
  score: ScoreSystem,
  particles: ParticleSystem,
  now: number,
  toScreen: (col: number, row: number) => { x: number; y: number },
  events: CollisionEvents,
): void {
  const invulnerable = now < player.invulnerableUntil;
  for (const e of enemies) {
    if (e.mode === 'eaten') continue;
    if (dist(player.col, player.row, e.col, e.row) > ENEMY_HIT_RADIUS) continue;

    if (e.mode === 'frightened') {
      score.chainKillCount++;
      const bonus = 200 * Math.min(score.chainKillCount, 5);
      score.addPoints(bonus);
      audio.playEnemyDefeat(score.chainKillCount);
      const pos = toScreen(e.col, e.row);
      particles.burstDefeat(pos.x, pos.y);
      e.mode = 'eaten';
    } else if (!invulnerable) {
      player.lives -= 1;
      player.invulnerableUntil = now + INVULNERABLE_MS;
      audio.playPlayerHit();
      const pos = toScreen(player.col, player.row);
      particles.burstHit(pos.x, pos.y);
      events.onPlayerHit();
      events.onLifeLost(player.lives);
    }
  }
}
