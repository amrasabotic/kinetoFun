import type { DartOutcome, DartRing } from '../types';

/** Standard dartboard sector order, clockwise from the top (12 o'clock), starting at 20. */
export const SECTOR_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export const SECTOR_WIDTH_DEG = 360 / SECTOR_ORDER.length;

/** Ring radii as a fraction of the board's outer (double-ring) edge — matches a regulation board's real proportions (170mm outer radius). */
export const RADII = {
  doubleBullOuter: 6.35 / 170,
  bullOuter: 15.9 / 170,
  tripleInner: 99 / 170,
  tripleOuter: 107 / 170,
  doubleInner: 162 / 170,
  doubleOuter: 1,
};

/** Sector number occupying a given clockwise angle from the top (degrees, any range). */
export function sectorAtAngle(angleDeg: number): number {
  const normalized = ((angleDeg % 360) + 360) % 360;
  // Each sector is centered on its number, so its boundary sits half a
  // sector-width before the center — shift by that half-width before dividing.
  const index = Math.floor((normalized + SECTOR_WIDTH_DEG / 2) / SECTOR_WIDTH_DEG) % SECTOR_ORDER.length;
  return SECTOR_ORDER[index];
}

/** Center angle of a sector, clockwise degrees from the top. Inverse of sectorAtAngle. */
export function angleForSector(sector: number): number {
  const index = SECTOR_ORDER.indexOf(sector);
  return index * SECTOR_WIDTH_DEG;
}

/**
 * Resolves a dart impact (normalized -1..1 relative to board center, y-down)
 * into a sector/ring/points outcome. This is the single source of truth for
 * scoring — used identically for the player's gesture-driven throw and the
 * AI opponent's simulated throw (see systems/aiOpponent.ts), so both play by
 * the same board.
 */
export function scoreImpact(x: number, y: number): DartOutcome {
  const radius = Math.hypot(x, y);

  if (radius > RADII.doubleOuter) {
    return { sector: 0, ring: 'miss', multiplier: 0, points: 0, x, y };
  }
  if (radius <= RADII.doubleBullOuter) {
    return { sector: 25, ring: 'double_bull', multiplier: 2, points: 50, x, y };
  }
  if (radius <= RADII.bullOuter) {
    return { sector: 25, ring: 'bull', multiplier: 1, points: 25, x, y };
  }

  // Angle measured clockwise from straight up (12 o'clock), y-down screen space.
  const angleDeg = (Math.atan2(x, -y) * 180) / Math.PI;
  const sector = sectorAtAngle(angleDeg);

  if (radius <= RADII.tripleInner) {
    return { sector, ring: 'single_inner', multiplier: 1, points: sector, x, y };
  }
  if (radius <= RADII.tripleOuter) {
    return { sector, ring: 'triple', multiplier: 3, points: sector * 3, x, y };
  }
  if (radius <= RADII.doubleInner) {
    return { sector, ring: 'single_outer', multiplier: 1, points: sector, x, y };
  }
  return { sector, ring: 'double', multiplier: 2, points: sector * 2, x, y };
}

/** Inverse of scoreImpact: a representative point for a given sector+ring, used by the AI opponent to aim. */
export function pointForTarget(sector: number, ring: DartRing): { x: number; y: number } {
  if (ring === 'double_bull') return { x: 0, y: 0 };
  if (ring === 'bull') return { x: (RADII.doubleBullOuter + RADII.bullOuter) / 2, y: 0 };

  let radius: number;
  switch (ring) {
    case 'triple':
      radius = (RADII.tripleInner + RADII.tripleOuter) / 2;
      break;
    case 'double':
      radius = (RADII.doubleInner + RADII.doubleOuter) / 2;
      break;
    case 'single_outer':
      radius = (RADII.tripleOuter + RADII.doubleInner) / 2;
      break;
    default:
      radius = (RADII.bullOuter + RADII.tripleInner) / 2; // single_inner
  }

  const rad = (angleForSector(sector) * Math.PI) / 180;
  // Inverse of scoreImpact's atan2(x, -y): x = r*sin(angle), y = -r*cos(angle)
  return { x: radius * Math.sin(rad), y: -radius * Math.cos(rad) };
}

export const RING_LABEL: Record<DartRing, string> = {
  double_bull: 'Bullseye!',
  bull: 'Outer Bull',
  triple: 'Triple!',
  double: 'Double',
  single_inner: 'Single',
  single_outer: 'Single',
  miss: 'No Score',
};
