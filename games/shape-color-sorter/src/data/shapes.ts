import type { ShapeId } from '../types';

export interface ShapeDef { id: ShapeId; label: string }

export const SHAPES: ShapeDef[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
  { id: 'diamond', label: 'Diamond' },
];

export function shapeLabel(id: ShapeId): string {
  return SHAPES.find((s) => s.id === id)?.label ?? id;
}

export function randomShape(exclude?: ShapeId[]): ShapeId {
  const filtered = SHAPES.filter((s) => !exclude?.includes(s.id));
  const pool = filtered.length > 0 ? filtered : SHAPES;
  return pool[Math.floor(Math.random() * pool.length)].id;
}
