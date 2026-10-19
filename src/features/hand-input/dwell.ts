// Hold-to-select ("dwell") for any page built from `[data-focusable]` elements.
//
// The hand cursor hovers an element, a ring fills, and when it is full the
// element is clicked, so existing buttons and links work unchanged. The rules
// mirror the in-game dwell buttons, including the lessons learned there:
// - A screen change disarms dwell for a moment; otherwise a hand resting where
//   the next screen puts a button selects it instantly.
// - Hover must be continuous; leaving the element restarts the count.
// - An element that was just selected must be left before it can fire again,
//   so holding still never repeats the same action.

import { FOCUSABLE_SELECTOR } from "@/components/navigation/SpatialNavigation";

export const DWELL_MS = 900;
export const ARM_DELAY_MS = 1500;
export const COOLDOWN_MS = 600;
/** How far outside an element the cursor may be and still snap to it. */
export const SNAP_PX = 56;

/** Set on the element the hand is over, for styling (see globals.css). */
export const HAND_HOVER_ATTR = "data-hand-hover";

export interface DwellFrame {
  target: HTMLElement | null;
  /** 0–1 fill of the dwell ring. */
  progress: number;
}

function isUsable(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function distanceToRect(x: number, y: number, rect: DOMRect): number {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
}

/**
 * The element under the cursor, or failing that the nearest one within
 * SNAP_PX. Snapping makes small or tightly spaced targets reachable with a
 * hand that is never perfectly still.
 */
function findTarget(x: number, y: number): HTMLElement | null {
  const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(FOCUSABLE_SELECTOR);
  if (hit && isUsable(hit)) return hit;

  let best: HTMLElement | null = null;
  let bestDistance = SNAP_PX;
  for (const el of document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) {
    if (!isUsable(el)) continue;
    const d = distanceToRect(x, y, el.getBoundingClientRect());
    if (d < bestDistance) {
      bestDistance = d;
      best = el;
    }
  }
  return best;
}

/** Whether the current screen has anything a hand could select. */
export function hasHandTargets(): boolean {
  for (const el of document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) {
    if (isUsable(el)) return true;
  }
  return false;
}

export class DwellEngine {
  private target: HTMLElement | null = null;
  private hoverStartedAt = 0;
  private armedAt = 0;
  private cooldownUntil = 0;
  private spent: HTMLElement | null = null;

  constructor(now: number) {
    this.rearm(now);
  }

  /** Call when the screen changes or a new choice appears (e.g. a confirm step). */
  rearm(now: number): void {
    this.armedAt = now + ARM_DELAY_MS;
  }

  /** `point` is in viewport pixels, or null when no hand is visible. */
  update(point: { x: number; y: number } | null, now: number): DwellFrame {
    const target = point ? findTarget(point.x, point.y) : null;

    if (target !== this.target) {
      this.target?.removeAttribute(HAND_HOVER_ATTR);
      this.target = target;
      this.hoverStartedAt = now;
      if (target !== this.spent) this.spent = null;
      if (target) {
        target.setAttribute(HAND_HOVER_ATTR, "");
        // Keeps keyboard/remote navigation continuing from where the hand is.
        target.focus({ preventScroll: true });
      }
    }

    if (!target || target === this.spent) return { target, progress: 0 };

    const countFrom = Math.max(this.hoverStartedAt, this.armedAt, this.cooldownUntil);
    const progress = Math.min(1, Math.max(0, (now - countFrom) / DWELL_MS));

    if (progress >= 1) {
      this.spent = target;
      this.cooldownUntil = now + COOLDOWN_MS;
      target.click();
    }

    return { target, progress };
  }

  dispose(): void {
    this.target?.removeAttribute(HAND_HOVER_ATTR);
    this.target = null;
  }
}
