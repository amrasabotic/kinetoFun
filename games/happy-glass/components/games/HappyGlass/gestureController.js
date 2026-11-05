'use client';

// Landmark indices
const WRIST      = 0;
const THUMB_MCP  = 2;
const THUMB_IP   = 3;
const THUMB_TIP  = 4;
const MIDDLE_MCP = 9;
const FINGERS    = [[8, 6], [12, 10], [16, 14], [20, 18]]; // [tip, PIP] for index..pinky

// All distances are measured against the hand's own size (wrist to middle knuckle),
// so gestures read the same whether the player is close to the camera or on the sofa.
const PINCH_ON    = 0.35; // thumb-index gap that starts a pinch
const PINCH_OFF   = 0.55; // gap that ends it; the band between stops the line flickering on and off
const PINCH_GRACE = 3;    // frames the pinch survives a brief tracking slip, so a stroke is not cut in two
const THUMB_GRACE = 4;    // frames a thumbs-up survives a slip, so the hold-to-launch bar does not restart
const SMOOTHING   = 0.38;

export function createGestureState() {
  return {
    gesture: 'none', // 'none' | 'open' | 'pinch' | 'fist' | 'thumbsup'
    x: 0, y: 0, smoothX: 0, smoothY: 0,
    pinchOn: false, pinchMiss: 0, thumbMiss: 0,
  };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Fingers judged by distance from the wrist, so a tilted or sideways hand and either hand work the same. */
function straightFingers(lm) {
  const w = lm[WRIST];
  return FINGERS.filter(([tip, pip]) => dist(lm[tip], w) > dist(lm[pip], w) * 1.1).length;
}

/** Thumbs-up: all four fingers folded, thumb held straight and pointing up. */
function isThumbsUp(lm, straight) {
  if (straight > 0) return false;
  const tip = lm[THUMB_TIP], mcp = lm[THUMB_MCP];
  const len = dist(tip, mcp);
  const straightThumb = len > (dist(mcp, lm[THUMB_IP]) + dist(lm[THUMB_IP], tip)) * 0.85;
  // Up within about 50 degrees of vertical: a tilted hand still counts, but a fist's thumb (across the fingers) never points up.
  const pointsUp = mcp.y - tip.y > len * 0.65;
  return straightThumb && pointsUp;
}

/**
 * Converts raw MediaPipe landmark sets into a gesture + smoothed cursor position.
 *
 * @param {Array|null} landmarkSets  - results.multiHandLandmarks (may be null/empty)
 * @param {object}     prev          - previous gesture state from createGestureState()
 * @param {number}     canvasW
 * @param {number}     canvasH
 * @returns {object} new gesture state
 */
export function processLandmarks(landmarkSets, prev, canvasW, canvasH) {
  if (!landmarkSets || landmarkSets.length === 0) {
    return { ...prev, gesture: 'none', pinchOn: false, pinchMiss: 0, thumbMiss: 0 };
  }

  const lm = landmarkSets[0];
  const size = Math.max(0.04, dist(lm[WRIST], lm[MIDDLE_MCP]));

  // Cursor follows the index tip; mirror X so it matches natural hand movement.
  const rawX = (1 - lm[8].x) * canvasW;
  const rawY = lm[8].y * canvasH;
  const fresh = prev.gesture === 'none';
  const smoothX = fresh ? rawX : prev.smoothX + SMOOTHING * (rawX - prev.smoothX);
  const smoothY = fresh ? rawY : prev.smoothY + SMOOTHING * (rawY - prev.smoothY);

  const gap = dist(lm[THUMB_TIP], lm[8]) / size;
  const straight = straightFingers(lm);

  // Pinch with hysteresis and a short grace period on release.
  let pinchOn = prev.pinchOn, pinchMiss = prev.pinchMiss;
  // In a fist the thumb also lands near the index tip, but there the index is tucked against the palm; in a pinch it points forward.
  const indexOut = dist(lm[8], lm[WRIST]) > size * 0.95;
  if (!pinchOn && gap < PINCH_ON && indexOut) { pinchOn = true; pinchMiss = 0; }
  else if (pinchOn && (gap > PINCH_OFF || !indexOut)) { pinchMiss++; if (pinchMiss > PINCH_GRACE) { pinchOn = false; pinchMiss = 0; } }
  else if (pinchOn) pinchMiss = 0;

  // Thumbs-up, kept through a few missed frames once it has been seen.
  let thumbMiss = prev.thumbMiss;
  let thumbs = isThumbsUp(lm, straight);
  if (thumbs) thumbMiss = 0;
  else if (prev.gesture === 'thumbsup' && !pinchOn && straight < 2 && ++thumbMiss <= THUMB_GRACE) thumbs = true;
  else thumbMiss = 0;

  let gesture;
  if (thumbs && !pinchOn) gesture = 'thumbsup';
  else if (pinchOn) gesture = 'pinch';
  else if (straight === 0) gesture = 'fist';
  else gesture = 'open';

  return { gesture, x: rawX, y: rawY, smoothX, smoothY, pinchOn, pinchMiss, thumbMiss };
}
