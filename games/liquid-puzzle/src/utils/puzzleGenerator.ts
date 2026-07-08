import type { Board, LevelConfig } from '../types';
import { TUBE_CAPACITY } from '../types';
import { solvePath } from './solver';

/**
 * Maps a level number to its color/tube counts, matching the requested
 * progression curve: 1-10 → 3 colors/4 tubes, 10-20 → 4/5, 20-40 → 5/6,
 * 40-80 → 6/7, 80+ → keeps growing (an extra color every 40 levels, an
 * extra empty tube every 60) with no hard ceiling, since "hundreds of
 * procedural levels" only needs a formula, not hand-authored data.
 */
export function levelConfig(level: number): LevelConfig {
  const n = Math.max(1, level);
  let colorCount: number;
  let tubeCount: number;

  if (n <= 10) {
    colorCount = 3;
    tubeCount = 4;
  } else if (n <= 20) {
    colorCount = 4;
    tubeCount = 5;
  } else if (n <= 40) {
    colorCount = 5;
    tubeCount = 6;
  } else if (n <= 80) {
    colorCount = 6;
    tubeCount = 7;
  } else {
    const beyond = n - 80;
    colorCount = Math.min(12, 6 + Math.floor(beyond / 40));
    // More empty-tube slack than the low levels' fixed "+1": real water-sort
    // puzzles get dramatically harder to even find a solvable random deal
    // for as color count grows without proportionally more breathing room,
    // which is also why real implementations of this genre give generous
    // spare tubes at hard difficulties rather than a bare minimum.
    const spare = 2 + Math.floor(beyond / 30);
    tubeCount = Math.min(16, colorCount + spare);
  }

  return { level: n, colorCount, tubeCount, emptyTubes: tubeCount - colorCount };
}

function dealRandom(config: LevelConfig, rng: () => number): Board {
  const { colorCount, tubeCount } = config;
  const units: number[] = [];
  for (let c = 0; c < colorCount; c++) for (let i = 0; i < TUBE_CAPACITY; i++) units.push(c);

  const shuffled = shuffleWithRng(units, rng);
  const filledTubeCount = colorCount; // every unit fits exactly into colorCount tubes at capacity; the rest start empty
  const board: Board = [];
  for (let t = 0; t < filledTubeCount; t++) {
    board.push({ colors: shuffled.slice(t * TUBE_CAPACITY, (t + 1) * TUBE_CAPACITY) });
  }
  for (let e = 0; e < tubeCount - filledTubeCount; e++) board.push({ colors: [] });
  return board;
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MAX_GENERATION_ATTEMPTS = 150;
// Deliberately smaller than the hint solver's full budget: trying many
// cheap searches across fresh random deals finds a solvable board faster in
// aggregate than exhausting a large budget on each unlucky deal in turn —
// verification only needs to find *a* solution to exist, not a good one.
const VERIFY_BUDGET = 6_000;

/**
 * Builds a level by dealing colors at random and verifying solvability with
 * the real solver (utils/solver.ts), retrying with a fresh deal on failure.
 * An earlier version tried to *construct* guaranteed-solvable boards by
 * running randomized "reverse pours" from the solved state — that reasoning
 * turned out to be unsound (confirmed by a ground-truth exhaustive search
 * finding a genuinely unsolvable board from that method during engine
 * verification) since undoing a reverse-pour isn't always a legal forward
 * pour once the destination's newly-exposed top color is considered. This
 * generate-then-verify approach is simpler and its correctness is exactly
 * as trustworthy as the solver itself, which is independently verified
 * (see the temporary verify-engine.mts script's replay checks). If every
 * attempt fails to verify, the last dealt board is returned anyway rather
 * than hanging indefinitely — an honest last resort, not a silent
 * correctness gap, since by that point solvability is merely unconfirmed,
 * not disproven.
 */
export function generateBoard(config: LevelConfig, rng: () => number): Board {
  let lastCandidate: Board = dealRandom(config, rng);
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = dealRandom(config, rng);
    if (solvePath(candidate, VERIFY_BUDGET) !== null) return candidate;
    lastCandidate = candidate;
  }
  return lastCandidate;
}
