import type { Direction, Settings, Vec2 } from '../types/GameTypes';
import type { HandData } from './useMediaPipe';

/**
 * Smooths raw hand position and resolves it to one of the four movement
 * zones (or null = "center", meaning "keep whatever direction was last
 * requested"). Runs from the game's own RAF loop rather than a separate
 * hook so gameplay never pays for an extra render cycle.
 */
export class DirectionZoneTracker {
  private smoothX = 0.5;
  private smoothY = 0.5;
  private primed = false;

  sample(hand: HandData | null, settings: Settings, calibration: Vec2 | null): Direction | null {
    if (!hand || !hand.detected) return null;
    const cx = calibration?.x ?? 0.5;
    const cy = calibration?.y ?? 0.5;

    if (!this.primed) {
      this.smoothX = hand.palmX;
      this.smoothY = hand.palmY;
      this.primed = true;
    }
    const alpha = 1 - settings.smoothing;
    this.smoothX += (hand.palmX - this.smoothX) * alpha;
    this.smoothY += (hand.palmY - this.smoothY) * alpha;

    const dx = (this.smoothX - cx) * settings.sensitivity;
    const dy = (this.smoothY - cy) * settings.sensitivity;
    const mag = Math.hypot(dx, dy);
    if (mag < settings.deadzone) return null;

    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  reset(): void {
    this.primed = false;
  }
}

export interface HeldGestureState {
  active: boolean;
  progress: number;
  justFired: boolean;
}

/** Generic "hold this gesture for N ms" confirmer — used for pause/resume/confirm/restart. */
export class HeldGestureTracker {
  private startedAt: number | null = null;
  private firedForThisHold = false;

  constructor(private holdMs: number) {}

  update(active: boolean, now: number): HeldGestureState {
    if (!active) {
      this.startedAt = null;
      this.firedForThisHold = false;
      return { active: false, progress: 0, justFired: false };
    }
    if (this.startedAt === null) this.startedAt = now;
    const progress = Math.min((now - this.startedAt) / this.holdMs, 1);
    let justFired = false;
    if (progress >= 1 && !this.firedForThisHold) {
      this.firedForThisHold = true;
      justFired = true;
    }
    return { active: true, progress, justFired };
  }

  reset(): void {
    this.startedAt = null;
    this.firedForThisHold = false;
  }
}

export const MENU_DWELL_MS = 1200;
export const GESTURE_HOLD_MS = 700;
