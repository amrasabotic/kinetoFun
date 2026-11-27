import type { Point, Spot } from "../types";
import { clamp } from "./motion";

/** Width of the mascot's frame in logo pixels; a spot's width is this frame at screen size. */
export const FRAME_WIDTH = 600;

/** Points on the mascot, in logo pixels. */
export const ANCHORS = {
  /** The middle of its base, where a spot places it. */
  base: { x: 381, y: 798 },
  /** Between the eyes. */
  eyes: { x: 381, y: 590 },
  /** Inside the fingers of the logo hand, where it holds what it catches. */
  palm: { x: 165, y: 600 },
  /** The same place on the second hand, the logo hand mirrored. */
  palm2: { x: 597, y: 600 },
} as const;

/** From the base to the top of the outer signal arc, in logo pixels. */
const HEIGHT = 420;

/** How far the eyes can turn, in logo pixels. */
const LOOK = { x: 9, y: 7 };

export const logoScale = (width: number) => width / FRAME_WIDTH;

/** How tall the mascot stands at `width`, from its base to the top of its antenna's signal. */
export const mascotHeight = (width: number) => HEIGHT * logoScale(width);

/** Where a point on the mascot lands on the TV screen, for a mascot at `spot` lifted by `bounce` logo pixels. */
export function fromLogo(spot: Spot, point: Point, bounce = 0): Point {
  const scale = logoScale(spot.width);
  return {
    x: spot.x + (point.x - ANCHORS.base.x) * scale,
    y: spot.y + (point.y - ANCHORS.base.y + bounce) * scale,
  };
}

/** The wrist the logo hand turns around, in logo pixels; the second hand's is its mirror. */
const WRIST = { x: 212, y: 728 };

/**
 * Where a point on one of the hands lands on the TV screen while the hand
 * is turned `wave` degrees at the wrist. The second hand is the first one
 * mirrored, so it turns the other way for the same `wave`.
 */
export function handPoint(spot: Spot, point: Point, wave: number, second = false, bounce = 0): Point {
  const wrist = second ? { x: ANCHORS.base.x * 2 - WRIST.x, y: WRIST.y } : WRIST;
  const angle = ((second ? -wave : wave) * Math.PI) / 180;
  const dx = point.x - wrist.x;
  const dy = point.y - wrist.y;
  const turned = {
    x: wrist.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: wrist.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
  return fromLogo(spot, turned, bounce);
}

/** The eye turn that makes the mascot at `spot` look at `target`; close targets get a smaller turn. */
export function lookAt(spot: Spot, target: Point) {
  const eyes = fromLogo(spot, ANCHORS.eyes);
  const dx = target.x - eyes.x;
  const dy = target.y - eyes.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return { lookX: 0, lookY: 0 };
  const reach = clamp(distance / (spot.width * 0.4), 0, 1);
  return { lookX: (LOOK.x * dx * reach) / distance, lookY: (LOOK.y * dy * reach) / distance };
}
