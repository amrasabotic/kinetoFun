import type { HoleDef } from '../types';

// Coordinates are normalized 0..1 across the green; y=0 is the far edge (near
// the cup), y=1 is the near edge (where the tee sits), matching the same
// "player at the bottom, target at the top" convention as the bowling lane.
export const COURSE: HoleDef[] = [
  {
    id: 1,
    par: 2,
    tee: { x: 0.5, y: 0.85 },
    cup: { x: 0.5, y: 0.15 },
    cupRadius: 0.055,
    obstacles: [],
  },
  {
    id: 2,
    par: 3,
    tee: { x: 0.25, y: 0.85 },
    cup: { x: 0.75, y: 0.15 },
    cupRadius: 0.05,
    obstacles: [{ kind: 'wall', x: 0.45, y: 0.4, w: 0.1, h: 0.3 }],
  },
  {
    id: 3,
    par: 3,
    tee: { x: 0.5, y: 0.88 },
    cup: { x: 0.5, y: 0.12 },
    cupRadius: 0.05,
    obstacles: [{ kind: 'sand', x: 0.35, y: 0.4, w: 0.3, h: 0.2 }],
  },
  {
    id: 4,
    par: 4,
    tee: { x: 0.15, y: 0.85 },
    cup: { x: 0.85, y: 0.15 },
    cupRadius: 0.045,
    obstacles: [
      { kind: 'water', x: 0.4, y: 0.35, w: 0.2, h: 0.3 },
      { kind: 'wall', x: 0.0, y: 0.55, w: 0.35, h: 0.05 },
    ],
  },
  {
    id: 5,
    par: 4,
    tee: { x: 0.5, y: 0.88 },
    cup: { x: 0.2, y: 0.12 },
    cupRadius: 0.045,
    obstacles: [
      { kind: 'slope', x: 0.3, y: 0.3, w: 0.4, h: 0.3, dx: 0.7, dy: 0 },
      { kind: 'wall', x: 0.55, y: 0.15, w: 0.3, h: 0.06 },
    ],
  },
  {
    id: 6,
    par: 5,
    tee: { x: 0.5, y: 0.9 },
    cup: { x: 0.5, y: 0.1 },
    cupRadius: 0.04,
    obstacles: [
      { kind: 'wall', x: 0.05, y: 0.4, w: 0.15, h: 0.5 },
      { kind: 'wall', x: 0.8, y: 0.4, w: 0.15, h: 0.5 },
      { kind: 'water', x: 0.35, y: 0.25, w: 0.3, h: 0.15 },
      { kind: 'sand', x: 0.2, y: 0.55, w: 0.6, h: 0.15 },
    ],
  },
];
