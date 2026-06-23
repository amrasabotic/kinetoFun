import { GAME_CONFIG } from './constants.js';
import { handsAboveHead, detectClap, personInFrame } from './PoseComparator.js';

// Manages timed gesture detection (hold-to-confirm, clap, etc.)
export class GestureRecognizer {
  constructor() {
    this._handsUpStart = null;
    this._personDetectedStart = null;
    this._freezeStart = null;
    this._prevLandmarks = null;
    this._clapCooldown = 0;
  }

  // Call each frame with current smoothed landmarks
  // Returns an object of detected gesture events
  update(landmarks, motionLevel, now) {
    const events = {
      startGesture: false,
      clapGesture: false,
      freezeGesture: false,
    };

    // ── Person detection timer ───────────────────────────────────────────
    if (personInFrame(landmarks)) {
      if (!this._personDetectedStart) {
        this._personDetectedStart = now;
      } else if (now - this._personDetectedStart >= GAME_CONFIG.DETECTION_HOLD_MS) {
        events.personDetected = true;
      }
    } else {
      this._personDetectedStart = null;
    }

    // ── Hands-up start gesture ───────────────────────────────────────────
    if (handsAboveHead(landmarks)) {
      if (!this._handsUpStart) {
        this._handsUpStart = now;
      } else if (now - this._handsUpStart >= GAME_CONFIG.HANDS_UP_HOLD_MS) {
        events.startGesture = true;
        this._handsUpStart = now; // reset to avoid re-firing
      }
    } else {
      this._handsUpStart = null;
    }

    // ── Clap gesture ─────────────────────────────────────────────────────
    if (this._clapCooldown > 0) {
      this._clapCooldown -= 1;
    } else if (detectClap(landmarks, this._prevLandmarks)) {
      events.clapGesture = true;
      this._clapCooldown = 30; // ~1s cooldown at 30fps
    }

    // ── Freeze / pause ───────────────────────────────────────────────────
    if (personInFrame(landmarks) && motionLevel < GAME_CONFIG.FREEZE_THRESHOLD) {
      if (!this._freezeStart) {
        this._freezeStart = now;
      } else if (now - this._freezeStart >= GAME_CONFIG.FREEZE_HOLD_MS) {
        events.freezeGesture = true;
        this._freezeStart = now;
      }
    } else {
      this._freezeStart = null;
    }

    this._prevLandmarks = landmarks ? [...landmarks] : null;
    return events;
  }

  // Progress toward hands-up start gesture (0..1)
  handsUpProgress(now) {
    if (!this._handsUpStart) return 0;
    return Math.min(1, (now - this._handsUpStart) / GAME_CONFIG.HANDS_UP_HOLD_MS);
  }

  // Progress toward person-detected auto-start (0..1)
  personDetectedProgress(now) {
    if (!this._personDetectedStart) return 0;
    return Math.min(1, (now - this._personDetectedStart) / GAME_CONFIG.DETECTION_HOLD_MS);
  }

  // Progress toward freeze pause (0..1)
  freezeProgress(now) {
    if (!this._freezeStart) return 0;
    return Math.min(1, (now - this._freezeStart) / GAME_CONFIG.FREEZE_HOLD_MS);
  }

  reset() {
    this._handsUpStart = null;
    this._personDetectedStart = null;
    this._freezeStart = null;
    this._prevLandmarks = null;
    this._clapCooldown = 0;
  }
}
