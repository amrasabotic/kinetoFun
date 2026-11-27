import type { BurstState, CursorState, MascotPose, PlayBox, Point } from "../../types";
import { ease, progress, wobble } from "../motion";
import { boxPoint, glide, hop, shownBetween, sizeScale, tremor } from "./shared";

/** The letter blocks: letter, where across the play box, when each drops in, and when the cursor taps it. */
export const BLOCKS = [
  { letter: "A", across: 0.55, drop: 0.24, tap: 1.0 },
  { letter: "B", across: 0.73, drop: 0.36, tap: 1.4 },
  { letter: "C", across: 0.91, drop: 0.48, tap: 1.8 },
] as const;

const SIZE = 54;
/** The block's face sits on its darker edge, which rests on the ground. */
const EDGE = 0.08;
const DROP_SECONDS = 0.42;
const LIGHT_SECONDS = 0.2;
const LEAVE = { at: 2.24, stagger: 0.06, seconds: 0.22 };
const CURSOR = { in: 0.7, out: 2.24, enter: { u: 0.6, v: 0.18 } };

export type Block = {
  letter: string;
  /** Centre of the block. */
  x: number;
  y: number;
  size: number;
  /** -1 stretched to 1 squashed, from the block's base. */
  squash: number;
  /** 0 pale to 1 lit in its colour. */
  lit: number;
  scale: number;
};

export type LearnState = { blocks: Block[]; bursts: BurstState[]; cursor: CursorState; look: Point };

function blockAt(index: number, local: number, box: PlayBox): Block {
  const block = BLOCKS[index];
  const size = SIZE * sizeScale(box);
  const rest = { x: boxPoint(box, block.across, 0).x, y: box.ground - size * (0.5 + EDGE) };
  const fall = progress(local, block.drop, block.drop + DROP_SECONDS);
  const top = -size;
  const landed = local - (block.drop + DROP_SECONDS);
  const leave = LEAVE.at + index * LEAVE.stagger;
  return {
    letter: block.letter,
    x: rest.x,
    y: top + (rest.y - top) * fall * fall - 16 * sizeScale(box) * hop(local, block.tap, 0.32),
    size,
    squash: landed > 0 ? 0.35 * wobble(landed, 3, 7) : 0,
    lit: ease.enter(progress(local, block.tap, block.tap + LIGHT_SECONDS)),
    scale: 1 - ease.leave(progress(local, leave, leave + LEAVE.seconds)),
  };
}

/** Learn: A, B and C drop into a row, and each lights up as the hand taps it. */
export function learnAt(local: number, box: PlayBox): LearnState {
  const blocks = BLOCKS.map((_, i) => blockAt(i, local, box)).filter((_, i) => local >= BLOCKS[i].drop);
  const bursts = BLOCKS.filter((b) => local >= b.tap).map((b) => ({
    at: { x: boxPoint(box, b.across, 0).x, y: box.ground - SIZE * sizeScale(box) * (0.5 + EDGE) },
    amount: Math.min(1, (local - b.tap) / 0.55),
  }));

  // The hand moves from block to block and rests on each as it taps.
  const target = (i: number) => {
    const block = blockAt(i, BLOCKS[i].tap, box);
    return { x: block.x, y: block.y };
  };
  let point = glide(local, CURSOR.in, BLOCKS[0].tap, boxPoint(box, CURSOR.enter.u, CURSOR.enter.v), target(0), 24);
  for (let i = 1; i < BLOCKS.length; i++) {
    if (local >= BLOCKS[i - 1].tap) point = glide(local, BLOCKS[i - 1].tap + 0.12, BLOCKS[i].tap, target(i - 1), target(i), -22);
  }
  const still = tremor(local);
  const cursor: CursorState = {
    point: { x: point.x + still.x, y: point.y + still.y },
    shown: shownBetween(local, CURSOR.in, CURSOR.out, 0.25, 0.25),
    fill: 0,
    swell: BLOCKS.reduce((sum, b) => sum + hop(local, b.tap, 0.24), 0),
  };
  return { blocks, bursts, cursor, look: cursor.shown > 0.2 ? cursor.point : boxPoint(box, 0.7, 0.8) };
}

/** The mascot nods at each letter as it lights up, and its antenna signals. */
export function learnPose(pose: MascotPose, local: number): MascotPose {
  const nod = BLOCKS.reduce((sum, b) => sum + hop(local, b.tap + 0.02, 0.3), 0);
  const signal = (delay: number) => Math.min(1, BLOCKS.reduce((sum, b) => sum + hop(local, b.tap + delay, 0.45), 0));
  return {
    ...pose,
    bounce: pose.bounce - 18 * nod,
    lean: pose.lean + 5 * nod,
    mouth: Math.min(1, pose.mouth + 0.5 * nod),
    signalNear: Math.max(pose.signalNear, signal(0)),
    signalFar: Math.max(pose.signalFar, signal(0.15)),
  };
}
