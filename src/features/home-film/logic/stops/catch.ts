import type { BurstState, MascotPose, PlayBox, Point, Spot } from "../../types";
import { ANCHORS, handPoint } from "../mascot-space";
import { ease, progress, wobble } from "../motion";
import { hop, sizeScale } from "./shared";

/** Stars that fall into the mascot's hands: which hand, when it lands, and where across it starts falling from. */
export const STARS = [
  { hand: 1, at: 1.0, drift: -34, size: 1 },
  { hand: 2, at: 1.4, drift: 30, size: 0.92 },
  { hand: 1, at: 1.8, drift: 24, size: 1.06 },
] as const;

const FALL_SECONDS = 0.8;
/** Where a star starts, above the top of the screen. */
const SKY = -36;
/** Degrees each hand turns up to meet a star. */
const REACH = 16;
const STAR_RADIUS = 21;
const SECOND_HAND = { in: 0.45, out: 2.32 };
const CHEER = { at: 1.98, until: 2.36 };

export type FallingStar = { x: number; y: number; r: number; angle: number; scale: number };

export type CatchState = {
  stars: FallingStar[];
  bursts: BurstState[];
  look: Point | null;
};

const handTurn = (local: number, hand: 1 | 2) =>
  STARS.reduce((sum, star) => {
    if (star.hand !== hand) return sum;
    const up = ease.enter(progress(local, star.at - 0.4, star.at - 0.08)) * (1 - ease.glide(progress(local, star.at + 0.06, star.at + 0.4)));
    return sum + REACH * up - 7 * hop(local, star.at, 0.22);
  }, 0);

/** Where a star lands: inside the fingers of the hand that catches it, turned up to meet it. */
export const landingOf = (index: number, spot: Spot) =>
  STARS[index].hand === 1 ? handPoint(spot, ANCHORS.palm, REACH) : handPoint(spot, ANCHORS.palm2, REACH, true);

/** Catch: stars fall, a second hand pops out, and the mascot catches with both hands. */
export function catchAt(local: number, box: PlayBox, spot: Spot): CatchState {
  const k = sizeScale(box);
  const stars: FallingStar[] = [];
  const bursts: BurstState[] = [];
  let look: Point | null = null;
  STARS.forEach((star, i) => {
    const landing = landingOf(i, spot);
    const fall = progress(local, star.at - FALL_SECONDS, star.at);
    if (fall <= 0) return;
    const shrink = progress(local, star.at, star.at + 0.16);
    const point = { x: landing.x + star.drift * k * (1 - fall) * (1 - fall), y: SKY + (landing.y - SKY) * fall * fall };
    if (shrink < 1) {
      stars.push({ ...point, r: STAR_RADIUS * k * star.size, angle: 260 * (local - star.at), scale: 1 - shrink });
    }
    if (local >= star.at) bursts.push({ at: landing, amount: Math.min(1, (local - star.at) / 0.5) });
    else if (look === null) look = point;
  });
  return { stars, bursts, look };
}

/** Both hands reach for their stars; a cheer with both hands once the last one is caught. */
export function catchPose(pose: MascotPose, local: number): MascotPose {
  const cheerWave = 18 * Math.sin(2 * Math.PI * 3 * (local - CHEER.at)) * hop(local, CHEER.at, CHEER.until - CHEER.at);
  const landed = STARS.reduce((sum, star) => sum + (local > star.at ? 0.32 * wobble(local - star.at, 3, 7) : 0), 0);
  const cheer = hop(local, CHEER.at, 0.36);
  return {
    ...pose,
    wave: pose.wave + handTurn(local, 1) + cheerWave,
    wave2: handTurn(local, 2) + cheerWave,
    hand2: ease.pop(progress(local, SECOND_HAND.in, SECOND_HAND.in + 0.32)) * (1 - ease.leave(progress(local, SECOND_HAND.out, SECOND_HAND.out + 0.26))),
    squash: pose.squash + landed - 0.3 * cheer,
    bounce: pose.bounce - 40 * cheer,
    mouth: Math.min(1, pose.mouth + 0.4 * landed + cheer),
    wink: hop(local, CHEER.at, 0.5),
  };
}
