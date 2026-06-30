import type { EnergyOrb, OrbColor } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT, SCORE_PER_ORB, ORB_COUNT } from '../../constants/gameConfig';
import { randomRange } from '../../utils/mathUtils';

let orbIdCounter = 0;

const ORB_COLORS: OrbColor[] = ['blue','green','purple','gold','rainbow'];
const COLOR_WEIGHTS = [40, 30, 15, 10, 5]; // cumulative weights

function pickOrbColor(): OrbColor {
  const r = Math.random() * 100;
  let acc = 0;
  for (let i = 0; i < ORB_COLORS.length; i++) {
    acc += COLOR_WEIGHTS[i];
    if (r < acc) return ORB_COLORS[i];
  }
  return 'blue';
}

const ORB_VALUES: Record<OrbColor, number> = {
  blue: SCORE_PER_ORB,
  green: SCORE_PER_ORB * 2,
  purple: SCORE_PER_ORB * 3,
  gold: SCORE_PER_ORB * 5,
  rainbow: SCORE_PER_ORB * 10,
};

const ORB_SIZES: Record<OrbColor, number> = {
  blue: 7,
  green: 9,
  purple: 11,
  gold: 13,
  rainbow: 16,
};

export function createOrb(x?: number, y?: number): EnergyOrb {
  const color = pickOrbColor();
  return {
    id: orbIdCounter++,
    x: x ?? randomRange(80, ARENA_WIDTH  - 80),
    y: y ?? randomRange(80, ARENA_HEIGHT - 80),
    radius: ORB_SIZES[color],
    value: ORB_VALUES[color],
    color,
    phase: Math.random() * Math.PI * 2,
    bobOffset: Math.random() * Math.PI * 2,
  };
}

export function initOrbs(): EnergyOrb[] {
  return Array.from({ length: ORB_COUNT }, () => createOrb());
}

export function updateOrbs(orbs: EnergyOrb[], dt: number): void {
  const dtS = dt / 1000;
  for (const orb of orbs) {
    orb.phase += dtS * 2;
    orb.bobOffset += dtS * 1.5;
  }
}

export function spawnDroppedOrbs(x: number, y: number, snakeLength: number): EnergyOrb[] {
  const count = Math.min(Math.floor(snakeLength / 3), 80);
  const orbs: EnergyOrb[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = randomRange(10, snakeLength * 0.8);
    orbs.push(createOrb(x + Math.cos(angle) * r, y + Math.sin(angle) * r));
  }
  return orbs;
}
