export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export interface WeightedEntry<T> {
  item: T;
  weight: number;
}

export function weightedPick<T>(entries: WeightedEntry<T>[], rand: () => number = Math.random): T | null {
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return entries[0].item;
  let r = rand() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.item;
  }
  return entries[entries.length - 1].item;
}

/** Small deterministic xorshift32 PRNG, seeded, for reproducible-but-varied level generation. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return function next() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export function distance2D(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

let idCounter = 1;
export function nextId(): number {
  return idCounter++;
}

/** Evenly spaced lane offsets across the track width, e.g. laneSlots(3) -> [-w, 0, w]. */
export function laneSlots(count: number, halfWidth: number): number[] {
  if (count <= 1) return [0];
  const span = halfWidth * 1.35;
  const slots: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0..1
    slots.push(-span + t * span * 2);
  }
  return slots;
}
