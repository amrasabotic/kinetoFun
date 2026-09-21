// Enemy roster + per-wave spawn planning. Behaviour lives in the engine; this
// file holds the tuning numbers and the wave composition logic.

export type EnemyKind =
  | 'grunt' | 'runner' | 'heavy' | 'archer' | 'shield' | 'jumper' | 'ninja' | 'boss';

export interface EnemyStat {
  kind: EnemyKind;
  name: string;
  hp: number;          // body hits to defeat (headshots always 1-shot non-bosses)
  speed: number;       // walk speed (ref px/frame ×U)
  color: string;       // body colour
  head: string;        // head colour
  scoreMult: number;
  throws: boolean;     // can hurl a spear at the player
  throwEveryMs: number;// average throw cadence
  ranged: boolean;     // hangs back at distance (archer)
  prefersPlatform: boolean;
  scale: number;       // body size multiplier
}

export const STATS: Record<EnemyKind, EnemyStat> = {
  grunt:  { kind: 'grunt',  name: 'Stickman',     hp: 1, speed: 0.55, color: '#d94f4f', head: '#f1c9a5', scoreMult: 1.0, throws: true,  throwEveryMs: 3200, ranged: false, prefersPlatform: false, scale: 1.0 },
  runner: { kind: 'runner', name: 'Fast Runner',  hp: 1, speed: 1.15, color: '#e08a2f', head: '#f1c9a5', scoreMult: 1.2, throws: true,  throwEveryMs: 4200, ranged: false, prefersPlatform: false, scale: 0.92 },
  heavy:  { kind: 'heavy',  name: 'Heavy Warrior',hp: 2, speed: 0.36, color: '#8a5a3a', head: '#e8b58c', scoreMult: 1.6, throws: true,  throwEveryMs: 3600, ranged: false, prefersPlatform: false, scale: 1.28 },
  archer: { kind: 'archer', name: 'Archer',       hp: 1, speed: 0.22, color: '#5aa86b', head: '#f1c9a5', scoreMult: 1.4, throws: true,  throwEveryMs: 2400, ranged: true,  prefersPlatform: true,  scale: 0.98 },
  shield: { kind: 'shield', name: 'Shield Bearer',hp: 1, speed: 0.40, color: '#6a78c0', head: '#f1c9a5', scoreMult: 1.7, throws: true,  throwEveryMs: 4000, ranged: false, prefersPlatform: false, scale: 1.06 },
  jumper: { kind: 'jumper', name: 'Jumper',       hp: 1, speed: 0.62, color: '#c059a8', head: '#f1c9a5', scoreMult: 1.6, throws: true,  throwEveryMs: 3800, ranged: false, prefersPlatform: true,  scale: 0.96 },
  ninja:  { kind: 'ninja',  name: 'Ninja',        hp: 1, speed: 0.85, color: '#3a3a4e', head: '#e8b58c', scoreMult: 2.0, throws: true,  throwEveryMs: 3000, ranged: false, prefersPlatform: true,  scale: 0.94 },
  boss:   { kind: 'boss',   name: 'Giant Boss',   hp: 28, speed: 0.20, color: '#b23a3a', head: '#f0bd92', scoreMult: 5.0, throws: true,  throwEveryMs: 2200, ranged: false, prefersPlatform: false, scale: 2.6 },
};

export interface SpawnEntry { kind: EnemyKind; atMs: number; }
export interface WavePlan { wave: number; isBoss: boolean; entries: SpawnEntry[]; }

export function isBossWave(wave: number): boolean {
  return wave % 5 === 0;
}

/** Pool of kinds available at a given wave, with weights. */
function pool(wave: number): [EnemyKind, number][] {
  const p: [EnemyKind, number][] = [['grunt', 5]];
  if (wave >= 2) p.push(['runner', 3]);
  if (wave >= 3) p.push(['archer', 2]);
  if (wave >= 6) p.push(['heavy', 2]);
  if (wave >= 7) p.push(['shield', 2]);
  if (wave >= 8) p.push(['jumper', 2]);
  if (wave >= 9) p.push(['ninja', 2]);
  return p;
}

function pick(p: [EnemyKind, number][], r: number): EnemyKind {
  const total = p.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [k, w] of p) { if ((x -= w) <= 0) return k; }
  return p[0][0];
}

/** Build the spawn plan for a wave. `rnd` is a 0..1 generator. */
export function buildWave(wave: number, rnd: () => number): WavePlan {
  if (isBossWave(wave)) {
    const entries: SpawnEntry[] = [{ kind: 'boss', atMs: 200 }];
    const adds = 1 + Math.floor(wave / 10);
    for (let i = 0; i < adds; i++) {
      entries.push({ kind: rnd() > 0.5 ? 'runner' : 'grunt', atMs: 1400 + i * 2600 });
    }
    return { wave, isBoss: true, entries };
  }

  const count = Math.min(16, 3 + Math.round(wave * 1.25));
  const gap = Math.max(620, 1500 - wave * 60); // faster spawns later
  const pl = pool(wave);
  const entries: SpawnEntry[] = [];
  let t = 300;
  for (let i = 0; i < count; i++) {
    entries.push({ kind: pick(pl, rnd()), atMs: t });
    t += gap * (0.6 + rnd() * 0.8);
  }
  return { wave, isBoss: false, entries };
}
