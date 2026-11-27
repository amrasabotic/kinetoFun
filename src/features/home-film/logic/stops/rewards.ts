import type { BurstState, MascotPose, PlayBox, Point } from "../../types";
import { mascotHeight } from "../mascot-space";
import { ease, lerp, progress, wobble } from "../motion";
import { hop, shownBetween, sizeScale } from "./shared";

/** The podium: place, where it stands from the middle (in bar widths), its height as a share of the play box, and when it rises. */
const BARS = [
  { place: 2, side: -1, height: 0.24, rise: 0.35 },
  { place: 1, side: 0, height: 0.36, rise: 1.12 },
  { place: 3, side: 1, height: 0.16, rise: 0.47 },
] as const;
const BAR_WIDTH = 92;
const BAR_GAP = 6;
const RISE_SECONDS = 0.38;
const LOWER = { start: 2.62, end: 2.95 };

/** The mascot crouches, then jumps as the winner's bar rises under it. */
export const JUMP = { crouch: 0.82, start: 1.05, land: 1.5, arc: 0.65 } as const;

const TICKETS = 5;
const TICKET = { launch: 1.62, stagger: 0.11, flight: 0.5 };
/** The counter's number is an example, not a real total. */
const COUNT_FROM = 120;
const PER_TICKET = 10;
const COUNTER = { in: 1.3, out: 2.85 };
const SECOND_HAND_IN = 1.55;
const CHEER = { start: 1.6, end: 2.6 };

export type Bar = { place: number; x: number; width: number; height: number };
export type Ticket = { x: number; y: number; angle: number; scale: number };

export type RewardsState = {
  bars: Bar[];
  /** Ground level of the bar under the mascot, in screen units above the play box ground. */
  surface: number;
  /** How far the mascot is above that surface, in screen units. */
  lift: number;
  tickets: Ticket[];
  counter: { x: number; y: number; value: number; shown: number; pulse: number; scale: number };
  bursts: BurstState[];
  look: Point | null;
};

const barHeight = (index: number, local: number, box: PlayBox) => {
  const bar = BARS[index];
  const up = ease.pop(progress(local, bar.rise, bar.rise + RISE_SECONDS));
  const down = ease.glide(progress(local, LOWER.start, LOWER.end));
  return bar.height * box.height * up * (1 - down);
};

/** How high the mascot's base is above the play box ground at `local`. */
export function mascotHeightAbove(local: number, box: PlayBox) {
  const top = BARS[1].height * box.height;
  if (local < JUMP.start) return 0;
  if (local < JUMP.land) {
    const p = progress(local, JUMP.start, JUMP.land);
    return lerp(0, top, p) + JUMP.arc * top * 4 * p * (1 - p);
  }
  return barHeight(1, local, box);
}

/** Rewards: podium bars rise, the mascot jumps onto the top one, and tickets fly to a counter. */
export function rewardsAt(local: number, box: PlayBox): RewardsState {
  const k = sizeScale(box);
  const middle = box.x + box.width / 2;
  const width = BAR_WIDTH * k;
  const bars = BARS.map((bar, i) => ({
    place: bar.place,
    x: middle + bar.side * (width + BAR_GAP * k),
    width,
    height: barHeight(i, local, box),
  }));
  const surface = bars[1].height;
  const above = mascotHeightAbove(local, box);

  const counterShown = shownBetween(local, COUNTER.in, COUNTER.out, 0.3, 0.25);
  const counterAt = { x: box.x + box.width - 66 * k, y: box.y + 26 * k - (1 - counterShown) * 50 * k };
  const from = { x: middle, y: box.ground - bars[1].height - mascotHeight(box.mascot) * 0.45 };
  const tickets: Ticket[] = [];
  let arrived = 0;
  let pulse = 0;
  for (let i = 0; i < TICKETS; i++) {
    const launch = TICKET.launch + i * TICKET.stagger;
    const p = progress(local, launch, launch + TICKET.flight);
    pulse += hop(local, launch + TICKET.flight, 0.2);
    if (p >= 1) arrived++;
    if (p <= 0 || p >= 1) continue;
    const a = ease.glide(p);
    const control = { x: lerp(from.x, counterAt.x, 0.35) - 30 * k, y: Math.min(from.y, counterAt.y) - 70 * k };
    tickets.push({
      x: (1 - a) * (1 - a) * from.x + 2 * (1 - a) * a * control.x + a * a * counterAt.x,
      y: (1 - a) * (1 - a) * from.y + 2 * (1 - a) * a * control.y + a * a * counterAt.y,
      angle: -18 + 400 * a + i * 30,
      scale: Math.sin(Math.PI * Math.min(1, p * 1.6)) * 0.4 + 0.6 * (1 - a) + 0.35 * a,
    });
  }

  const head = { x: middle, y: box.ground - bars[1].height - mascotHeight(box.mascot) * 0.85 };
  const bursts = local >= JUMP.land ? [{ at: head, amount: Math.min(1, (local - JUMP.land) / 0.8) }] : [];
  return {
    bars,
    surface,
    lift: Math.max(0, above - surface),
    tickets,
    counter: { ...counterAt, value: COUNT_FROM + PER_TICKET * arrived, shown: counterShown, pulse: Math.min(1, pulse), scale: k },
    bursts,
    look: local < JUMP.crouch ? null : tickets.length > 0 ? counterAt : null,
  };
}

/** A crouch before the jump, a squash on landing, then a cheer with both hands up. */
export function rewardsPose(pose: MascotPose, local: number): MascotPose {
  const crouch = Math.sin(Math.PI * progress(local, JUMP.crouch, JUMP.start + 0.06));
  const flight = Math.sin(Math.PI * progress(local, JUMP.start, JUMP.land));
  const landed = local > JUMP.land ? 0.6 * wobble(local - JUMP.land, 2.4, 5) : 0;
  const cheer = shownBetween(local, CHEER.start, CHEER.end, 0.15, 0.3);
  const waving = 20 * Math.sin(2 * Math.PI * 2.8 * (local - CHEER.start)) * cheer;
  return {
    ...pose,
    squash: pose.squash + 0.55 * crouch - 0.6 * flight + landed,
    wave: pose.wave + waving + 10 * cheer,
    wave2: waving + 10 * cheer,
    hand2: ease.pop(progress(local, SECOND_HAND_IN, SECOND_HAND_IN + 0.3)),
    mouth: Math.min(1, pose.mouth + flight + cheer),
    wink: hop(local, 1.7, 0.5),
    lookY: pose.lookY - 6 * crouch,
  };
}
