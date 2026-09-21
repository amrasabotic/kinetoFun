import { ARENA_WIDTH, ARENA_HEIGHT, ENVIRONMENTS } from '../../constants/gameConfig';
import type { Environment } from '../../types';
import { pick } from '../../utils/mathUtils';

export interface ArenaDecoration {
  x: number;
  y: number;
  type: 'bush' | 'rock' | 'crystal' | 'dot' | 'star';
  size: number;
  color: string;
  angle: number;
}

export function pickEnvironment(): Environment {
  return pick(ENVIRONMENTS);
}

export function generateDecorations(env: Environment, count = 400): ArenaDecoration[] {
  const decorations: ArenaDecoration[] = [];
  const types: ArenaDecoration['type'][] = ['bush', 'rock', 'crystal', 'dot', 'star'];

  for (let i = 0; i < count; i++) {
    const x = 80 + Math.random() * (ARENA_WIDTH  - 160);
    const y = 80 + Math.random() * (ARENA_HEIGHT - 160);
    decorations.push({
      x, y,
      type: types[Math.floor(Math.random() * types.length)],
      size: 8 + Math.random() * 24,
      color: env.decorationColors[Math.floor(Math.random() * env.decorationColors.length)],
      angle: Math.random() * Math.PI * 2,
    });
  }
  return decorations;
}

export function isInsideArena(x: number, y: number, margin = 0): boolean {
  return x > margin && y > margin &&
         x < ARENA_WIDTH - margin && y < ARENA_HEIGHT - margin;
}

export function clampToArena(x: number, y: number, margin = 20): { x: number; y: number } {
  return {
    x: Math.max(margin, Math.min(ARENA_WIDTH  - margin, x)),
    y: Math.max(margin, Math.min(ARENA_HEIGHT - margin, y)),
  };
}
