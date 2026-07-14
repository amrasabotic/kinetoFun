/**
 * Procedural terrain generator.
 * Creates smooth endless hills using layered sine waves.
 * Converts surface points into Matter.js static rectangle segments.
 */
import Matter from 'matter-js';
import type { TerrainChunk, TerrainPoint } from '../../types';
import {
  TERRAIN_BASE_Y,
  TERRAIN_POINT_STEP,
  CAT_TERRAIN,
  CAT_VEHICLE,
  DIFFICULTY_MAX,
} from '../../constants/gameConfig';

const { Bodies, Composite } = Matter;

// Noise parameters per octave for terrain generation
const OCTAVES = [
  { freq: 0.0035, amp: 1.0 },
  { freq: 0.0080, amp: 0.45 },
  { freq: 0.0170, amp: 0.22 },
  { freq: 0.0380, amp: 0.10 },
];

/** Generate terrain surface Y at world x, given a difficulty level [0–5] */
export function terrainY(worldX: number, seed: number, difficulty: number): number {
  const amp   = 60 + difficulty * 22;   // taller hills as difficulty rises
  const shift = seed * 1000;
  let   y     = 0;
  for (const { freq, amp: a } of OCTAVES) {
    y += Math.sin((worldX + shift) * freq) * amp * a;
  }
  // occasional ramps & valleys
  y += Math.sin((worldX + shift * 0.3) * 0.002) * 30 * difficulty;
  return TERRAIN_BASE_Y + y;
}

/**
 * Generates a list of dense surface points for rendering (every STEP px in X).
 * Also returns coarser physics points (every 3 × STEP) for Matter.js bodies.
 */
function buildSurfacePoints(
  startX: number, endX: number,
  seed: number, difficulty: number,
): { render: TerrainPoint[]; physics: TerrainPoint[] } {
  const render: TerrainPoint[] = [];
  const physics: TerrainPoint[] = [];
  const step = TERRAIN_POINT_STEP;

  for (let x = startX; x <= endX; x += step) {
    const y = terrainY(x, seed, difficulty);
    render.push({ x, y });
    physics.push({ x, y });
  }
  // Ensure exact endpoint
  if (render[render.length - 1].x < endX) {
    const y = terrainY(endX, seed, difficulty);
    render.push({ x: endX, y });
    physics.push({ x: endX, y });
  }
  return { render, physics };
}

/** Converts two adjacent surface points into a static rectangle physics body. */
function makeSegment(p1: TerrainPoint, p2: TerrainPoint): Matter.Body {
  const cx    = (p1.x + p2.x) / 2;
  const cy    = (p1.y + p2.y) / 2;
  const dx    = p2.x - p1.x;
  const dy    = p2.y - p1.y;
  const len   = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  return Bodies.rectangle(cx, cy, len + 2, 36, {
    isStatic: true,
    angle,
    friction: 0.7,
    restitution: 0.04,
    label: 'terrain',
    collisionFilter: {
      category: CAT_TERRAIN,
      mask:     CAT_VEHICLE,
    },
  });
}

/**
 * Creates a new terrain chunk from startX to endX and adds its bodies to the world.
 */
export function createTerrainChunk(
  world: Matter.World,
  startX: number,
  endX: number,
  seed: number,
  difficulty: number,
): TerrainChunk {
  const { render, physics } = buildSurfacePoints(startX, endX, seed, difficulty);
  const bodies: Matter.Body[] = [];

  for (let i = 0; i < physics.length - 1; i++) {
    const seg = makeSegment(physics[i], physics[i + 1]);
    bodies.push(seg);
  }
  Composite.add(world, bodies);

  return { startX, endX, points: render, bodies };
}

/** Removes old terrain chunks behind the camera and disposes their physics bodies. */
export function cleanupTerrain(
  world: Matter.World,
  chunks: TerrainChunk[],
  cameraX: number,
  keepBehind: number,
): TerrainChunk[] {
  const cutoff = cameraX - keepBehind;
  const toRemove = chunks.filter(c => c.endX < cutoff);
  for (const chunk of toRemove) {
    Composite.remove(world, chunk.bodies as unknown as Matter.Body[]);
  }
  return chunks.filter(c => c.endX >= cutoff);
}

/**
 * Returns the surface Y of the terrain at a given world X,
 * interpolating between the two nearest points in the chunks array.
 */
export function getTerrainY(chunks: TerrainChunk[], worldX: number): number {
  for (const chunk of chunks) {
    if (worldX < chunk.startX || worldX > chunk.endX) continue;
    const pts = chunk.points;
    for (let i = 0; i < pts.length - 1; i++) {
      if (pts[i].x <= worldX && pts[i + 1].x >= worldX) {
        const t = (worldX - pts[i].x) / (pts[i + 1].x - pts[i].x);
        return pts[i].y + t * (pts[i + 1].y - pts[i].y);
      }
    }
  }
  return TERRAIN_BASE_Y; // fallback
}

/**
 * Scales difficulty from 0 at start to DIFFICULTY_MAX over several km.
 */
export function getDifficulty(distanceMeters: number): number {
  return Math.min(DIFFICULTY_MAX, distanceMeters / 1000);
}
